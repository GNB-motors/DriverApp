import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTelematicsDemo } from './TelematicsDemoContext';
import { DRIVER_RESOURCES, selectDriverView } from '../services/driverView';
const Context = createContext(null);
export function DriverDataProvider({ children }) {
  const service = useTelematicsDemo();
  const sequence = useRef(0);
  const mounted = useRef(true);
  const [preferences, setPreferences] = useState({ nickname: '' });
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setState((old) => ({ ...old, loading: true, error: null }));
    try {
      const results = await Promise.all(DRIVER_RESOURCES.map((resource) => service.list(resource)));
      if (mounted.current && current === sequence.current) setState({ data: selectDriverView(Object.fromEntries(DRIVER_RESOURCES.map((resource, i) => [resource, results[i]]))), loading: false, error: null });
    } catch (error) {
      if (mounted.current && current === sequence.current) setState((old) => ({ ...old, loading: false, error: error.message }));
    }
  }, [service]);
  useEffect(() => { mounted.current = true; refresh(); return () => { mounted.current = false; sequence.current += 1; }; }, [refresh]);
  const mutate = async (action) => { const result = await action(service); await refresh(); return result; };
  return <Context.Provider value={{ ...state, refresh, mutate, service, preferences, setPreferences }}>{children}</Context.Provider>;
}
export const useDriverData = () => useContext(Context);
