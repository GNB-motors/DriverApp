import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

// Keyed results mask old account/branch/date data immediately, before effects run.
export default function useOwnerRequest(key, read, pollMs = 0) {
  const loader = useRef(read);
  loader.current = read;
  const generation = useRef(0);
  const [state, setState] = useState({
    key: null,
    data: null,
    loading: true,
    error: "",
  });
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    setState((old) => ({
      key,
      data: old.key === key ? old.data : null,
      loading: true,
      error: "",
    }));
    try {
      const data = await loader.current();
      if (revision === generation.current)
        setState({ key, data, loading: false, error: "" });
    } catch (error) {
      if (revision === generation.current)
        setState((old) => ({
          key,
          data: old.key === key ? old.data : null,
          loading: false,
          error:
            old.key === key && old.data
              ? `Could not refresh; showing previously loaded data. ${error.message}`
              : error.message,
        }));
    }
  }, [key]);
  useFocusEffect(
    useCallback(() => {
      refresh();
      const timer = pollMs
        ? setInterval(() => {
            if (AppState.currentState === "active") refresh();
          }, pollMs)
        : null;
      return () => {
        generation.current++;
        if (timer) clearInterval(timer);
      };
    }, [refresh, pollMs]),
  );
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  return {
    ...(state.key === key ? state : { data: null, loading: true, error: "" }),
    reload: refresh,
  };
}
