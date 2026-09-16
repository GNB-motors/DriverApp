import { useState, useCallback } from 'react';

/**
 * useSubmit — run an async write with busy/error state.
 *
 *   const { submit, busy, error } = useSubmit();
 *   submit(() => maintenanceService.createMaintenance(payload), { onSuccess: () => nav.goBack() });
 *
 * onError defaults to setting `error` (message). Never throws to the caller.
 */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (fn, { onSuccess, onError } = {}) => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (e) {
      const msg = e?.message || 'Something went wrong';
      setError(msg);
      if (onError) onError(e);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { submit, busy, error, setError };
}

export default useSubmit;
