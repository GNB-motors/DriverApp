/**
 * AccessContext.js
 *
 * What this user is allowed to see, resolved once at login from
 * GET /api/auth/me → { user, organization, permissions }.
 *
 * The backend gates every ERP request on THREE independent things:
 *
 *   1. role                       → authorize(...roles) per route
 *   2. organization.featureFlags   → requireFeature(flag) per router
 *   3. permissions (per user)      → checkPermission(key) on some modules
 *
 * A screen must be hidden when any of the three says no. Two traps this exists
 * to avoid:
 *
 *   • `requireFeature` answers **404, not 403**, so a module the org has not
 *     bought is indistinguishable from a missing record. Never infer
 *     availability from a status code — read the flags up front.
 *   • The web portal reads only `organization.featureFlags` and throws away
 *     `permissions`, so a restricted employee still sees nav they cannot use.
 *     This app honours both.
 */

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchMe } from '../services/api';
import logger from '../utils/logger';

// ── ERP module flags, mirroring backend featureFlag.constants.js ────────────
export const ERP_FLAGS = [
  'erpMasters',
  'erpCallPlanning',
  'erpDeliveryOrders',
  'erpPlacement',
  'erpAdvances',
  'erpCnUpdation',
  'erpTripClose',
  'erpPod',
  'erpAccounts',
  'erpUnloading',
  'erpBilling',
  'erpFinance',
  'erpApprovals',
  'erpOperations',
];

export const FLEET_FLAGS = [
  'overview',
  'reports',
  'vehicleActivity',
  'locations',
  'fuelComparison',
  'khataLedger',
  'dailyMileageReport',
  'geofence',
];

/**
 * Capability → the roles the BACKEND actually allows. Transcribed from the
 * authorize() lists so the UI cannot offer an action that will 403.
 *
 * Notable: `approvals.decide` excludes MANAGER. The backend's DECIDERS list is
 * ['OWNER', 'APPROVER', 'SUPER_ADMIN'] — a manager may read the queue but not
 * act on it. The queue is therefore read-only for managers rather than hidden,
 * which matches what the server will do.
 */
export const CAPABILITIES = {
  // Trips
  'trips.view':            ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'trips.close':           ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'SUPER_ADMIN'],
  'trips.viewOwn':         ['DRIVER', 'SUPER_ADMIN'],
  // Consignments
  'cn.view':               ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'cn.save':               ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'DRIVER', 'SUPER_ADMIN'],
  // PODs
  'pod.view':              ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'pod.record':            ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'DRIVER', 'SUPER_ADMIN'],
  // Advances
  'advances.view':         ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'advances.request':      ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'SUPER_ADMIN'],
  'advances.pay':          ['OWNER', 'MANAGER', 'ACCOUNTS', 'SUPER_ADMIN'],
  'advances.viewOwn':      ['DRIVER', 'SUPER_ADMIN'],
  // Placements & DOs
  'placements.view':       ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'KAM', 'ACCOUNTS', 'SUPER_ADMIN'],
  'placements.create':     ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'SUPER_ADMIN'],
  'dos.view':              ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'KAM', 'ACCOUNTS', 'SUPER_ADMIN'],
  'dos.create':            ['OWNER', 'MANAGER', 'KAM', 'SUPER_ADMIN'],
  // Unloading
  'unloading.view':        ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'unloading.save':        ['OWNER', 'MANAGER', 'OPS_EXECUTIVE', 'SUPER_ADMIN'],
  // Billing & finance
  'billing.view':          ['OWNER', 'MANAGER', 'ACCOUNTS', 'KAM', 'SUPER_ADMIN'],
  'billing.create':        ['OWNER', 'MANAGER', 'ACCOUNTS', 'SUPER_ADMIN'],
  'billing.cancel':        ['OWNER', 'SUPER_ADMIN'],
  'finance.view':          ['OWNER', 'MANAGER', 'ACCOUNTS', 'SUPER_ADMIN'],
  'ledger.view':           ['OWNER', 'MANAGER', 'ACCOUNTS', 'SUPER_ADMIN'],
  'ledger.adjust':         ['OWNER', 'SUPER_ADMIN'],
  // Approvals
  'approvals.view':        ['OWNER', 'MANAGER', 'APPROVER', 'ACCOUNTS', 'SUPER_ADMIN'],
  'approvals.decide':      ['OWNER', 'APPROVER', 'SUPER_ADMIN'],
  // Dashboard & CRM
  'dashboard.view':        ['OWNER', 'MANAGER', 'KAM', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'parties.view':          ['OWNER', 'MANAGER', 'KAM', 'OPS_EXECUTIVE', 'ACCOUNTS', 'SUPER_ADMIN'],
  'calls.view':            ['OWNER', 'MANAGER', 'KAM', 'SUPER_ADMIN'],
  'calls.logOutcome':      ['OWNER', 'MANAGER', 'KAM', 'SUPER_ADMIN'],
  // Fleet
  'alerts.view':           ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
  'khata.viewAll':         ['OWNER', 'MANAGER', 'ACCOUNTS', 'SUPER_ADMIN'],
  'khata.viewOwn':         ['DRIVER', 'SUPER_ADMIN'],
  'expenses.create':       ['OWNER', 'MANAGER', 'ACCOUNTS', 'DRIVER', 'SUPER_ADMIN'],
};

/**
 * Capability → the org feature flag it also needs. A capability with no entry
 * here is not module-gated.
 */
const CAPABILITY_FLAGS = {
  'trips.view': 'erpTripClose',
  'trips.close': 'erpTripClose',
  'trips.viewOwn': 'erpTripClose',
  'cn.view': 'erpCnUpdation',
  'cn.save': 'erpCnUpdation',
  'pod.view': 'erpPod',
  'pod.record': 'erpPod',
  'advances.view': 'erpAdvances',
  'advances.request': 'erpAdvances',
  'advances.pay': 'erpAdvances',
  'advances.viewOwn': 'erpAdvances',
  'placements.view': 'erpPlacement',
  'placements.create': 'erpPlacement',
  'dos.view': 'erpDeliveryOrders',
  'dos.create': 'erpDeliveryOrders',
  'unloading.view': 'erpUnloading',
  'unloading.save': 'erpUnloading',
  'billing.view': 'erpBilling',
  'billing.create': 'erpBilling',
  'billing.cancel': 'erpBilling',
  'finance.view': 'erpFinance',
  'ledger.view': 'erpAccounts',
  'ledger.adjust': 'erpAccounts',
  'approvals.view': 'erpApprovals',
  'approvals.decide': 'erpApprovals',
  'parties.view': 'erpMasters',
  'calls.view': 'erpCallPlanning',
  'calls.logOutcome': 'erpCallPlanning',
  'khata.viewAll': 'khataLedger',
  'khata.viewOwn': 'khataLedger',
};

const AccessContext = createContext(null);

export function AccessProvider({ children }) {
  const { user, token, organization: authOrg } = useAuth();

  const [flags, setFlags] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [organization, setOrganization] = useState(authOrg ?? null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user || !token) {
      setFlags(null);
      setPermissions(null);
      setOrganization(null);
      return;
    }
    setLoading(true);
    try {
      const me = await fetchMe(token);
      setOrganization(me?.organization ?? null);
      setFlags(me?.organization?.featureFlags ?? {});
      setPermissions(me?.permissions ?? {});
    } catch (err) {
      // Fail OPEN on flags for the driver's own core features (fuel, repairs,
      // documents) — those are not flag-gated and must keep working offline or
      // when /me is briefly unavailable. ERP surfaces stay hidden because
      // `hasFlag` treats a null flag map as "unknown → not enabled".
      logger.warn('Access', `Could not resolve access for ${user.role}: ${err?.message}`);
      setFlags({});
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => {
    const role = user?.role ?? null;
    const flagMap = flags ?? {};
    const permMap = permissions ?? {};

    const hasFlag = (key) => !key || flagMap[key] === true;

    /** Owner and super admin bypass the per-user layer, as the backend does. */
    const hasPermission = (key) => {
      if (!key) return true;
      if (role === 'OWNER' || role === 'SUPER_ADMIN') return true;
      return permMap[key] === true;
    };

    /**
     * The single gate every screen and nav item should use.
     * Role AND org flag AND (where applicable) per-user permission.
     */
    const can = (capability) => {
      const roles = CAPABILITIES[capability];
      if (!roles) {
        logger.warn('Access', `Unknown capability "${capability}" — denying`);
        return false;
      }
      if (!role || !roles.includes(role)) return false;
      const flag = CAPABILITY_FLAGS[capability];
      if (flag && !hasFlag(flag)) return false;
      // The ERP modules are not checkPermission-gated on the backend, so only
      // the flag applies there. khataLedger is, hence the explicit check.
      if (flag === 'khataLedger' && !hasPermission('khataLedger') && role !== 'DRIVER') {
        return false;
      }
      return true;
    };

    const hasErpModule = ERP_FLAGS.some(hasFlag);
    const hasFleetModule = FLEET_FLAGS.some(hasFlag);

    return {
      role,
      organization,
      flags: flagMap,
      permissions: permMap,
      loading,
      // Until /me resolves, `flags` is null and every ERP capability is denied —
      // screens should render their loading state, not an empty state.
      resolved: flags !== null,
      can,
      hasFlag,
      hasPermission,
      hasErpModule,
      hasFleetModule,
      refresh: load,
    };
  }, [user, flags, permissions, organization, loading, load]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used inside <AccessProvider>');
  return ctx;
}
