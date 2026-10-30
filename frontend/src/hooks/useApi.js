import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Read server data only. A changed query immediately masks previous data;
// failed/disabled requests and late responses never restore a fallback.
export function useApi(fn, deps = [], { enabled = true } = {}) {
  const loader = useRef(fn);
  loader.current = fn;
  const lifecycle = useRef({ generation: 0 }).current;
  // Callers supply query/account dependencies; fn may be an inline function.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => ({}), [enabled, ...deps]);
  const [state, setState] = useState({ scope: null, data: null, loading: !!enabled, error: null });

  const run = useCallback(async () => {
    const current = ++lifecycle.generation;
    setState({ scope, data: null, error: null, loading: !!enabled });
    if (!enabled) return;
    try {
      const data = await loader.current();
      if (current === lifecycle.generation) setState({ scope, data, error: null, loading: false });
    } catch (error) {
      if (current === lifecycle.generation) setState({ scope, data: null, error, loading: false });
    }
  }, [enabled, scope, lifecycle]);

  useEffect(() => {
    run();
    return () => { lifecycle.generation++; };
  }, [run, lifecycle]);

  const visible = state.scope === scope ? state : { data: null, error: null, loading: !!enabled };
  return { data: visible.data, loading: visible.loading, error: visible.error, refetch: run };
}
export default useApi;
