import { AppState } from "react-native";
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
import { useAuth } from "../../context/AuthContext";
const Context = createContext(null);
const idOf = (value) =>
  value && typeof value === "object" ? String(value._id || value.id || "") || null : value ? String(value) : null;
export function ManagerDataProvider({ children, audience = "manager" }) {
  const service = useTelematicsApi();
  const { user } = useAuth();
  // A manager works one branch — the one on their user record — and cannot switch.
  // An owner starts on all branches and may narrow the whole app to one.
  const locked = audience !== "owner" && user?.role === "MANAGER";
  const assignedBranch = locked ? idOf(user?.branchId) : null;
  const [lastPush, setLastPush] = useState(null);
  const [branches, setBranches] = useState([
    { id: "all", name: "Authorized branches" },
  ]);
  const [chosenBranch, setChosenBranch] = useState("all");
  const branchId = locked ? assignedBranch || "all" : chosenBranch;
  const setBranchId = useCallback(
    (id) => {
      if (!locked) setChosenBranch(id || "all");
    },
    [locked],
  );
  // Every request a page makes without naming a branch carries the active one, so no
  // screen can read outside it. Runs before the fleet load below.
  useEffect(() => {
    service.setActiveBranch?.(branchId === "all" ? null : branchId);
  }, [service, branchId]);
  const [state, setState] = useState({
    branchId: null,
    data: null,
    loading: true,
    error: null,
  });
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setState((old) => ({ ...old, data: null, loading: true, error: null }));
    try {
      const data = await service.loadFleet(
        branchId === "all" ? undefined : branchId,
      );
      if (current === sequence.current)
        setState({ branchId, data, loading: false, error: null });
    } catch (error) {
      if (current === sequence.current)
        setState({
          branchId,
          data: null,
          loading: false,
          error: error.message,
        });
    }
  }, [service, branchId]);
  useEffect(() => {
    refresh();
    return () => {
      sequence.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
    let active = true;
    service
      .branches()
      .then((items) => {
        if (!active) return;
        if (locked) {
          // The list endpoint returns the whole organisation; a manager sees only theirs.
          const own = items.filter((b) => String(b.id) === String(assignedBranch));
          setBranches(own.length ? own : [{ id: branchId, name: "Your branch" }]);
        } else setBranches([{ id: "all", name: "Authorized branches" }, ...items]);
      })
      .catch(() => {
        /* The fleet requests still enforce server-side branch authorization. */
      });
    return () => {
      active = false;
    };
  }, [service, locked, assignedBranch, branchId]);
  useEffect(() => {
    let active = true;
    let pending = false;
    const poll = async () => {
      if (pending || AppState.currentState !== "active") return;
      pending = true;
      try {
        const positions = await service.listPositions(
          branchId === "all" ? undefined : branchId,
        );
        if (active)
          setState((old) => {
            if (!old.data || old.branchId !== branchId) return old;
            const errors = { ...old.data.errors };
            delete errors.positions;
            return {
              ...old,
              data: {
                ...old.data,
                positions,
                errors,
                vehicles: service.mergePositions(
                  old.data.vehicles.filter(
                    (vehicle) => !vehicle.id.startsWith("position:"),
                  ),
                  positions,
                ),
              },
            };
          });
      } catch (error) {
        if (active)
          setState((old) =>
            old.data && old.branchId === branchId
              ? {
                  ...old,
                  data: {
                    ...old.data,
                    errors: { ...old.data.errors, positions: error.message },
                    vehicles: service.mergePositions(
                      old.data.vehicles.filter(
                        (vehicle) => !vehicle.id.startsWith("position:"),
                      ),
                      old.data.positions || [],
                    ),
                  },
                }
              : old,
          );
      } finally {
        pending = false;
      }
    };
    const timer = setInterval(poll, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") poll();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [service, branchId]);
  const onStreamEvent = useCallback((frame) => {
    setLastPush({ event: frame.event, data: frame.data, at: Date.now() });
  }, []);
  const { connected: streamConnected } = useDriverStream({
    service,
    enabled: audience === "driver",
    onEvent: onStreamEvent,
  });
  const mutate = async (action) => {
    const result = await action(
      service,
      branchId === "all" ? undefined : branchId,
    );
    await refresh();
    return result;
  };
  const matching = state.branchId === branchId;
  return (
    <Context.Provider
      value={{
        data: matching ? state.data : null,
        loading: matching ? state.loading : true,
        error: matching ? state.error : null,
        branchId,
        branches,
        canSwitchBranch: !locked,
        branchName: branches.find((b) => String(b.id) === String(branchId))?.name || null,
        roleLabel: audience === "owner" ? "OWNER" : "FLEET MANAGER",
        selectBranch: setBranchId,
        setBranchId,
        refresh,
        mutate,
        service,
        streamConnected,
        lastPush,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useManagerData = () => useContext(Context);
