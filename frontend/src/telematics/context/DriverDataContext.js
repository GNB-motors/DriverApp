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
import { useDriverStream } from "../realtime/useDriverStream";
const Context = createContext(null);
// Server pushes that mean the driver's own data changed and a refresh is worth
// it. freshness/hello/position are handled without a full reload.
const REFRESHING_EVENTS = new Set(["card", "message", "prompt", "visit", "eta", "alert"]);
export function DriverDataProvider({ children }) {
  const service = useTelematicsApi();
  const { user, token } = useAuth();
  const tracking = useDriverLocationSharing({ user, token, service });
  const sequence = useRef(0);
  const mounted = useRef(true);
  const refreshDebounce = useRef(null);
  const [lastPush, setLastPush] = useState(null);
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
  const onStreamEvent = useCallback((frame) => {
    setLastPush({ event: frame.event, data: frame.data, at: Date.now() });
    if (!REFRESHING_EVENTS.has(frame.event)) return;
    // Coalesce a burst of pushes into a single reload.
    if (refreshDebounce.current) clearTimeout(refreshDebounce.current);
    refreshDebounce.current = setTimeout(() => { refresh(); }, 800);
  }, [refresh]);
  const { connected: streamConnected } = useDriverStream({ service, onEvent: onStreamEvent });
  useEffect(() => () => { if (refreshDebounce.current) clearTimeout(refreshDebounce.current); }, []);
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
        streamConnected,
        lastPush,
      }}
    >
      <GuidanceRuntimeProvider identity={`${user._id}:${user.orgId?._id || user.orgId}:${state.data?.vehicle?.id || "none"}:${token}`}>{children}</GuidanceRuntimeProvider>
    </Context.Provider>
  );
}
export const useDriverData = () => useContext(Context);
