import { GuidanceRuntimeProvider } from '../guidance/GuidanceRuntimeContext';
import { AppState } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useDriverLocationSharing } from "../tracking/useDriverLocationSharing";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTelematicsApi } from "./TelematicsApiContext";
const Context = createContext(null);
export function DriverDataProvider({ children }) {
  const service = useTelematicsApi();
  const { user, token } = useAuth();
  const tracking = useDriverLocationSharing({ user, token, service });
  const sequence = useRef(0);
  const mounted = useRef(true);
  const [preferences, setPreferences] = useState({ nickname: "" });
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setState((old) => ({ ...old, loading: true, error: null }));
    try {
      const data = await service.loadDriver();
      if (mounted.current && current === sequence.current)
        setState({ data, loading: false, error: null });
    } catch (error) {
      if (mounted.current && current === sequence.current)
        setState((old) => ({
          ...old,
          data: null,
          loading: false,
          error: error.message,
        }));
    }
  }, [service]);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") refresh();
    }, 120000);
    const listener = AppState.addEventListener("change", (next) => {
      if (next === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      mounted.current = false;
      sequence.current += 1;
    };
  }, [refresh]);
  const mutate = async (action) => {
    const result = await action(service);
    await refresh();
    return result;
  };
  return (
    <Context.Provider
      value={{
        ...state,
        refresh,
        mutate,
        service,
        tracking,
        preferences,
        setPreferences,
      }}
    >
      <GuidanceRuntimeProvider identity={`${user._id}:${user.orgId?._id || user.orgId}:${state.data?.vehicle?.id || "none"}:${token}`}>{children}</GuidanceRuntimeProvider>
    </Context.Provider>
  );
}
export const useDriverData = () => useContext(Context);
