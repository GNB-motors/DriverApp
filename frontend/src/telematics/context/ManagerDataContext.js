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
