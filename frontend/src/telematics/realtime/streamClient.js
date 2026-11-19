// Zero-dependency SSE reader for React Native (N1.13).
//
// React Native has no native EventSource and the app pulls in no polyfill, so
// we read the text/event-stream over XMLHttpRequest, whose responseText grows
// incrementally during readyState 3 (LOADING). We slice off only the bytes we
// have not parsed yet and split on the SSE frame delimiter (a blank line).
//
// A frame is a block of `field: value` lines. We honour `event`, `data`, `id`
// and comment lines (starting with `:`, used by the server heartbeat). Multiple
// `data:` lines in one frame join with a newline, per the SSE spec.

function parseFrame(raw) {
  let event = 'message';
  let id = null;
  const dataLines = [];
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue; // comment / heartbeat
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
    else if (field === 'id') id = value;
  }
  if (!dataLines.length) return null;
  const text = dataLines.join('\n');
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* non-JSON data stays as the raw string */
  }
  return { event, id, data };
}

/**
 * Open an SSE connection. Returns a handle with close().
 * The connection is one-shot — reconnection/backoff is the caller's job
 * (see useDriverStream), so a closed socket does not silently retry here.
 */
export function openEventStream({ url, onEvent, onOpen, onError }) {
  const xhr = new XMLHttpRequest();
  let offset = 0;
  let buffer = '';
  let opened = false;
  let closed = false;

  xhr.open('GET', url, true);
  xhr.setRequestHeader('Accept', 'text/event-stream');

  const drain = () => {
    const chunk = xhr.responseText.slice(offset);
    offset = xhr.responseText.length;
    if (!chunk) return;
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const frame = parseFrame(raw);
      if (frame && !closed) onEvent?.(frame);
    }
  };

  xhr.onreadystatechange = () => {
    if (closed) return;
    if (xhr.readyState === 2 && xhr.status === 200 && !opened) {
      opened = true;
      onOpen?.();
    }
    if (xhr.readyState === 3) {
      if (xhr.status === 200) drain();
      else if (!opened) { opened = true; onError?.(new Error(`Stream HTTP ${xhr.status}`)); }
    }
    if (xhr.readyState === 4) {
      if (xhr.status === 200) drain();
      if (!closed) onError?.(new Error(xhr.status === 200 ? 'Stream closed' : `Stream HTTP ${xhr.status}`));
    }
  };
  xhr.onerror = () => { if (!closed) onError?.(new Error('Stream connection error')); };

  try {
    xhr.send();
  } catch (err) {
    onError?.(err);
  }

  return {
    close() {
      closed = true;
      try { xhr.abort(); } catch { /* already gone */ }
    },
  };
}
