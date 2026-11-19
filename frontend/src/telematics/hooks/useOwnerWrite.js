import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { isDefinitiveRejection } from "../services/ownerSubmission";

// Persist the complete submission before sending. A lost response reuses its UUID and content.
export default function useOwnerWrite(key) {
  const storageKey = `owner-write:v1:${key}`;
  const current = useRef(storageKey);
  current.current = storageKey;
  const writing = useRef(false);
  const [state, setState] = useState({
    key: null,
    ready: false,
    busy: false,
    draft: null,
    error: "",
  });
  useEffect(() => {
    let active = true;
    setState({
      key: storageKey,
      ready: false,
      busy: false,
      draft: null,
      error: "",
    });
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (active)
          setState({
            key: storageKey,
            ready: true,
            busy: false,
            draft: value ? JSON.parse(value) : null,
            error: "",
          });
      })
      .catch((error) => {
        if (active)
          setState({
            key: storageKey,
            ready: false,
            busy: false,
            draft: null,
            error: `Could not restore your submission: ${error.message}`,
          });
      });
    return () => {
      active = false;
    };
  }, [storageKey]);
  const matching = state.key === storageKey;
  async function execute(body, action) {
    if (writing.current || !matching || !state.ready) return null;
    writing.current = true;
    const atKey = storageKey;
    const draft = state.draft || {
      clientRequestId: Crypto.randomUUID(),
      ...body,
    };
    setState((old) => ({ ...old, busy: true, error: "", draft }));
    try {
      await AsyncStorage.setItem(atKey, JSON.stringify(draft));
      if (current.current !== atKey) return null;
      const result = await action(draft);
      await AsyncStorage.removeItem(atKey);
      if (current.current === atKey)
        setState({
          key: atKey,
          ready: true,
          busy: false,
          draft: null,
          error: "",
        });
      return current.current === atKey ? result : null;
    } catch (error) {
      // A definite validation/version rejection saved nothing. Network/5xx results stay retryable.
      let rejected = isDefinitiveRejection(error);
      if (rejected) {
        try {
          await AsyncStorage.removeItem(atKey);
        } catch {
          rejected = false;
        }
      }
      if (current.current === atKey)
        setState({
          key: atKey,
          ready: true,
          busy: false,
          draft: rejected ? null : draft,
          error: error.message,
        });
      return null;
    } finally {
      writing.current = false;
    }
  }
  return {
    ...(matching
      ? state
      : { ready: false, busy: false, draft: null, error: "" }),
    execute,
  };
}
