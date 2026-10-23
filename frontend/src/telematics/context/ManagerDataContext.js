import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTelematicsDemo } from './TelematicsDemoContext';
import { DRIVER_RESOURCES } from '../services/driverView';
import { DEMO_BRANCHES } from '../data/fixtures';
const Context = createContext(null);
const OWNER_RESOURCES = [...DRIVER_RESOURCES, 'adblue'];
export function ManagerDataProvider({ children, audience = 'manager' }) {
  const service = useTelematicsDemo();
  const owner = audience === 'owner';
  const resources = owner ? OWNER_RESOURCES : DRIVER_RESOURCES;
  const branches = owner ? [{ id: 'all', name: 'All branches' }, ...DEMO_BRANCHES] : DEMO_BRANCHES;
  const [branchId, setBranchId] = useState(owner ? 'all' : DEMO_BRANCHES[0].id);
  const [state, setState] = useState({ branchId: null, data: null, loading: true, error: null });
  const sequence = useRef(0); const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setState((old) => ({ ...old, loading: true, error: null }));
    try {
      const rows = await Promise.all(resources.map((key) => service.list(key, { branchId: branchId === 'all' ? undefined : branchId })));
      if (mounted.current && current === sequence.current) setState({ branchId, data: Object.fromEntries(resources.map((key, i) => [key, rows[i]])), loading: false, error: null });
    } catch (err) {
      if (mounted.current && current === sequence.current) setState({ branchId, data: null, loading: false, error: err.message });
    }
  }, [service, branchId, resources]);
  useEffect(() => { mounted.current = true; refresh(); return () => { mounted.current = false; sequence.current += 1; }; }, [refresh]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const mutate = async (action) => { const result = await action(service, branchId === 'all' ? undefined : branchId); if (mounted.current) await refreshRef.current(); return result; };
  const selectBranch = (id) => { if (id === branchId || !branches.some((branch) => branch.id === id)) return; sequence.current += 1; setBranchId(id); };
  const matching = state.branchId === branchId;
  return <Context.Provider value={{ data: matching ? state.data : null, loading: matching ? state.loading : true, error: matching ? state.error : null, branchId, branches, roleLabel: owner ? 'OWNER' : 'FLEET MANAGER', selectBranch, refresh, mutate, service }}>{children}</Context.Provider>;
}
export const useManagerData = () => useContext(Context);
