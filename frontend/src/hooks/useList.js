/**
 * useList.js
 *
 * The one fetch/filter/paginate primitive for every ERP list screen — the mobile
 * counterpart of the web's `useErpList`.
 *
 * Every list screen previously hand-rolled useState + useEffect with no request
 * cancellation and no consistent error handling, which is how several of them
 * ended up calling the wrong endpoint or rendering stale rows after a fast filter
 * change. One hook, one behaviour.
 *
 *   const { items, meta, loading, refreshing, error, filters, setFilter, refresh, loadMore }
 *     = useList(fetchErpTrips, { initial: { state: '' } });
 *
 * `fetcher(token, params, { signal })` must resolve `{ results, meta }` — which
 * is exactly what every function in erpApi returns for a list endpoint.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';

export default function useList(fetcher, { initial = {}, limit = 20, enabled = true } = {}) {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(initial);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Guards against a slow first request overwriting a faster later one after the
  // user changes a filter.
  const requestId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const run = useCallback(
    async (page, mode) => {
      if (!token || !enabled) {
        setLoading(false);
        return;
      }
      const id = ++requestId.current;

      if (mode === 'refresh') setRefreshing(true);
      else if (mode === 'more') setLoadingMore(true);
      else setLoading(true);

      try {
        const { results, meta: m } = await fetcher(token, { ...filters, page, limit });
        if (!mounted.current || id !== requestId.current) return; // superseded
        setItems((prev) => (mode === 'more' ? [...prev, ...results] : results));
        setMeta(m);
        setError(null);
      } catch (err) {
        if (!mounted.current || id !== requestId.current) return;
        // 404 here means the org does not have this ERP module enabled
        // (requireFeature answers 404, not 403) — an empty list, not a failure.
        if (err?.statusCode === 404) {
          if (mode !== 'more') setItems([]);
          setError(null);
        } else {
          logger.warn('useList', `Fetch failed: ${err?.message}`);
          setError(err?.message || 'Could not load this list.');
        }
      } finally {
        if (mounted.current && id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [token, enabled, fetcher, filters, limit],
  );

  useEffect(() => { run(1, 'initial'); }, [run]);

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const refresh = useCallback(() => run(1, 'refresh'), [run]);

  const page = meta?.page ?? 1;
  const totalPages = meta?.totalPages ?? 1;
  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    run(page + 1, 'more');
  }, [hasMore, loadingMore, loading, refreshing, page, run]);

  return {
    items,
    meta,
    filters,
    setFilter,
    setFilters,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  };
}
