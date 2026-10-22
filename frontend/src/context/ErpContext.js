/**
 * ErpContext.js
 *
 * Shared ERP data layer for the DriverApp.
 *
 * Responsibilities:
 *   • Fetch + cache the calling user's active ERP trip (drivers)
 *   • Fetch + cache the pending approvals count (managers/owners)
 *   • Poll both every 30 seconds while the app is foregrounded
 *   • Re-fetch immediately after any action that triggers a BullMQ
 *     state change (optimistic 3-second refresh)
 *   • Expose helper: triggerRefresh() — call after trip close, CN
 *     submit, POD submit, approval decision, etc.
 *
 * Usage:
 *   import { useErp } from '../context/ErpContext';
 *   const { activeTrip, pendingApprovalsCount, isLoading, triggerRefresh } = useErp();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { fetchDriverActiveTrip, fetchPendingApprovalsCount } from '../services/erpApi';

// ── Roles that see approval counts ─────────────────────────────────────────
const APPROVAL_ROLES = ['OWNER', 'MANAGER', 'OPS_EXECUTIVE'];
// ── Roles that have an active trip ─────────────────────────────────────────
const DRIVER_ROLES   = ['DRIVER'];
// ── Poll interval: 30 seconds ──────────────────────────────────────────────
const POLL_MS = 30_000;
// ── Optimistic re-fetch delay after an action: 3 seconds ──────────────────
const OPTIMISTIC_DELAY_MS = 3_000;

const ErpContext = createContext(null);

export function ErpProvider({ children }) {
  const { user, token } = useAuth();

  const [activeTrip, setActiveTrip]                   = useState(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [isLoading, setIsLoading]                     = useState(false);
  const [lastRefreshed, setLastRefreshed]             = useState(null);

  const pollTimerRef       = useRef(null);
  const optimisticTimerRef = useRef(null);
  const appStateRef        = useRef(AppState.currentState);

  // ── Core fetch function ──────────────────────────────────────────────────
  const fetchErpData = useCallback(async ({ silent = false } = {}) => {
    if (!user || !token) return;
    if (!silent) setIsLoading(true);

    try {
      const role = user.role;

      // Driver: fetch active trip
      if (DRIVER_ROLES.includes(role)) {
        try {
          const trip = await fetchDriverActiveTrip(token);
          setActiveTrip(trip ?? null);
        } catch {
          // Non-fatal — driver may have no active trip
          setActiveTrip(null);
        }
      }

      // Manager / Owner: fetch pending approvals count
      if (APPROVAL_ROLES.includes(role)) {
        try {
          const count = await fetchPendingApprovalsCount(token);
          setPendingApprovalsCount(count ?? 0);
        } catch {
          // Non-fatal — keep stale count
        }
      }

      setLastRefreshed(new Date());
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [user, token]);

  // ── Start / stop polling ─────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      fetchErpData({ silent: true });
    }, POLL_MS);
  }, [fetchErpData]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Optimistic re-fetch — call this after any state-changing action ──────
  const triggerRefresh = useCallback(() => {
    if (optimisticTimerRef.current) clearTimeout(optimisticTimerRef.current);
    optimisticTimerRef.current = setTimeout(() => {
      fetchErpData({ silent: true });
    }, OPTIMISTIC_DELAY_MS);
  }, [fetchErpData]);

  // ── App foreground/background handling ───────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — refresh immediately + restart poll
        fetchErpData({ silent: true });
        startPolling();
      } else if (nextState.match(/inactive|background/)) {
        // App went to background — pause polling to save battery
        stopPolling();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [fetchErpData, startPolling, stopPolling]);

  // ── Initial fetch + poll on login ────────────────────────────────────────
  useEffect(() => {
    if (!user || !token) {
      // Logged out — clear everything
      setActiveTrip(null);
      setPendingApprovalsCount(0);
      stopPolling();
      return;
    }

    fetchErpData();
    startPolling();

    return () => stopPolling();
  }, [user, token, fetchErpData, startPolling, stopPolling]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPolling();
      if (optimisticTimerRef.current) clearTimeout(optimisticTimerRef.current);
    };
  }, [stopPolling]);

  return (
    <ErpContext.Provider
      value={{
        activeTrip,
        pendingApprovalsCount,
        isLoading,
        lastRefreshed,
        triggerRefresh,
        refetch: () => fetchErpData(),
      }}
    >
      {children}
    </ErpContext.Provider>
  );
}

export function useErp() {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error('useErp must be used inside <ErpProvider>');
  return ctx;
}
