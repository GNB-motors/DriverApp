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
const Context = createContext(null);
export function ManagerDataProvider({ children, audience = "manager" }) {
  const service = useTelematicsApi();
  const [branches, setBranches] = useState([
    { id: "all", name: "Authorized branches" },
  ]);
  const [branchId, setBranchId] = useState("all");
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
        if (active)
          setBranches([{ id: "all", name: "Authorized branches" }, ...items]);
      })
      .catch(() => {
        /* The fleet requests still enforce server-side branch authorization. */
      });
    return () => {
      active = false;
    };
  }, [service]);
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
        roleLabel: audience === "owner" ? "OWNER" : "FLEET MANAGER",
        selectBranch: setBranchId,
        refresh,
        mutate,
        service,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useManagerData = () => useContext(Context);
