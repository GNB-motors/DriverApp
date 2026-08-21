import { useState, useEffect, useCallback } from 'react';

/**
 * useApi — tiny data-fetch hook for screens.
 *
 *   const { data, loading, error, refetch } = useApi(
 *     () => walletService.getDriverLedger(id),
 *     [id],
 *     { enabled: useReal, fallback: mock.ledger },
 *   );
 *
 * When `enabled` is false it stays on `fallback` (used so the offline demo keeps
 * rendering mock data). On error it falls back too, so a screen never blanks out.
 */
export function useApi(fn, deps = [], { enabled = true, fallback = null } = {}) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const d = await fn();
      setData(d);
    } catch (e) {
      setError(e);
      if (fallback != null) setData(fallback);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}

export default useApi;
