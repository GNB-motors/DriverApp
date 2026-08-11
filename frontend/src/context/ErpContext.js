/**
 * ErpContext.js
 *
 * Cross-screen ERP state: the driver's active trip, and the pending-approval
 * count that drives the Approvals tab badge.
 *
 * Polling is deliberate rather than optimistic. Trip state transitions are owned
 * by a BullMQ worker on the backend (`tripStateWorker`), so a 200 from a stage
 * POST does NOT mean `trip.state` has moved yet. `triggerRefresh()` schedules a
 * re-read shortly after an action so the UI catches up without lying about the
 * new state in the meantime.
 *
 * Errors are surfaced via `error`, not swallowed. The previous version caught
 * everything and set the trip to null, which is how a completely unreachable ERP
 * API looked exactly like "no trip assigned" for months.
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
import { useAccess } from './AccessContext';
import { fetchMyActiveTrip, fetchApprovalsSummary } from '../services/erpApi';
import logger from '../utils/logger';

const POLL_MS = 30_000;
/** How long to wait for the state worker before re-reading after an action. */
const WORKER_LAG_MS = 2_500;

const ErpContext = createContext(null);

export function ErpProvider({ children }) {
  const { user, token } = useAuth();
  const { can, resolved } = useAccess();

  const [activeTrip, setActiveTrip] = useState(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const pollTimer = useRef(null);
  const lagTimer = useRef(null);
  const appState = useRef(AppState.currentState);

  const wantsTrip = resolved && can('trips.viewOwn');
  const wantsApprovals = resolved && can('approvals.view');

  const fetchErpData = useCallback(async ({ silent = false } = {}) => {
    if (!user || !token || !resolved) return;
    if (!silent) setIsLoading(true);

    const failures = [];

    if (wantsTrip) {
      try {
        setActiveTrip(await fetchMyActiveTrip(token));
      } catch (err) {
        // 404 on the module gate means the org has no ERP — not an error worth
        // showing a driver. Anything else is a real failure.
        if (err?.statusCode === 404) setActiveTrip(null);
        else failures.push(`active trip: ${err?.message}`);
      }
    }

    if (wantsApprovals) {
      try {
        setPendingApprovalsCount(await fetchApprovalsSummary(token));
      } catch (err) {
        if (err?.statusCode !== 404) failures.push(`approvals: ${err?.message}`);
      }
    }

    if (failures.length) {
      const message = failures.join(' · ');
      logger.warn('Erp', `Refresh incomplete — ${message}`);
      setError(message);
    } else {
      setError(null);
    }

    setLastRefreshed(new Date());
    if (!silent) setIsLoading(false);
  }, [user, token, resolved, wantsTrip, wantsApprovals]);

  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    // Nothing to poll for roles with neither an own-trip nor an approvals queue.
    if (!wantsTrip && !wantsApprovals) return;
    pollTimer.current = setInterval(() => fetchErpData({ silent: true }), POLL_MS);
  }, [fetchErpData, wantsTrip, wantsApprovals]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  /** Call after any stage action so the worker's state change is picked up. */
  const triggerRefresh = useCallback(() => {
    if (lagTimer.current) clearTimeout(lagTimer.current);
    lagTimer.current = setTimeout(() => fetchErpData({ silent: true }), WORKER_LAG_MS);
  }, [fetchErpData]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        fetchErpData({ silent: true });
        startPolling();
      } else if (next.match(/inactive|background/)) {
        stopPolling();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [fetchErpData, startPolling, stopPolling]);

  useEffect(() => {
    if (!user || !token) {
      setActiveTrip(null);
      setPendingApprovalsCount(0);
      setError(null);
      stopPolling();
      return undefined;
    }
    fetchErpData();
    startPolling();
    return stopPolling;
  }, [user, token, fetchErpData, startPolling, stopPolling]);

  useEffect(() => () => {
    stopPolling();
    if (lagTimer.current) clearTimeout(lagTimer.current);
  }, [stopPolling]);

  return (
    <ErpContext.Provider
      value={{
        activeTrip,
        pendingApprovalsCount,
        isLoading,
        error,
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
