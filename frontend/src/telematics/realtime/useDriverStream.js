import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { openEventStream } from './streamClient';

// N1.13 — subscribe to the backend driver SSE hub.
//
// Lifecycle: mint a single-use ticket → open the stream → on any transport
// error, reconnect with capped exponential backoff. The stream is paused while
// the app is backgrounded (a parked phone should not hold a socket open) and
// resumed the moment it returns to the foreground.
//
// `onEvent` is called for every server event (hello, freshness, card, message,
// prompt, visit, eta, position). It is held in a ref so a caller can pass an
// inline closure without forcing the effect to tear the socket down each render.

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 2_000;

export function useDriverStream({ service, enabled = true, onEvent } = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState(null);
  const handleRef = useRef(null);
  const timerRef = useRef(null);
  const attemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };
  const closeStream = () => {
    if (handleRef.current) { handleRef.current.close(); handleRef.current = null; }
  };

  const connect = useCallback(async () => {
    if (stoppedRef.current || !service?.streamBaseUrl) return;
    clearTimer();
    closeStream();
    let ticket;
    try {
      ticket = await service.streamTicket();
    } catch {
      scheduleReconnect();
      return;
    }
    if (stoppedRef.current) return;
    const url = `${service.streamBaseUrl}?ticket=${encodeURIComponent(ticket)}`;
    handleRef.current = openEventStream({
      url,
      onOpen: () => {
        attemptRef.current = 0;
        setConnected(true);
      },
      onEvent: (frame) => {
        setLastEventAt(Date.now());
        if (frame.event === 'freshness') return; // keep-alive only, no payload to surface
        onEventRef.current?.(frame);
      },
      onError: () => {
        setConnected(false);
        scheduleReconnect();
      },
    });
    // scheduleReconnect is stable (defined below via ref closure); eslint cannot
    // see that so it is intentionally omitted from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const scheduleReconnect = useCallback(() => {
    if (stoppedRef.current) return;
    closeStream();
    clearTimer();
    const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attemptRef.current);
    attemptRef.current += 1;
    timerRef.current = setTimeout(() => { connect(); }, delay);
  }, [connect]);

  useEffect(() => {
    stoppedRef.current = !enabled;
    if (!enabled || !service?.streamBaseUrl) {
      closeStream();
      clearTimer();
      setConnected(false);
      return undefined;
    }
    stoppedRef.current = false;
    if (AppState.currentState === 'active') connect();

    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        attemptRef.current = 0;
        connect();
      } else {
        closeStream();
        clearTimer();
        setConnected(false);
      }
    });
    return () => {
      stoppedRef.current = true;
      listener.remove();
      closeStream();
      clearTimer();
    };
    // connect already depends on service; re-run when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, enabled]);

  return { connected, lastEventAt };
}
