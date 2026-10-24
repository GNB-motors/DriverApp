import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTelematicsApi } from './TelematicsApiContext';
const Context = createContext(null);
export function DriverDataProvider({ children }) {
  const service = useTelematicsApi();
  const sequence = useRef(0);
  const mounted = useRef(true);
  const [preferences, setPreferences] = useState({ nickname: '' });
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setState((old) => ({ ...old, loading: true, error: null }));
    try {
      const data = await service.loadDriver();
      if (mounted.current && current === sequence.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (mounted.current && current === sequence.current) setState((old) => ({ ...old, data: null, loading: false, error: error.message }));
    }
  }, [service]);
  useEffect(() => { mounted.current = true; refresh(); return () => { mounted.current = false; sequence.current += 1; }; }, [refresh]);
  const mutate = async (action) => { const result = await action(service); await refresh(); return result; };
  return <Context.Provider value={{ ...state, refresh, mutate, service, preferences, setPreferences }}>{children}</Context.Provider>;
}
export const useDriverData = () => useContext(Context);
