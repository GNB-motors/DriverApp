import React, { createContext, useContext, useEffect, useMemo } from 'react';
const Context = createContext(null);
export function GuidanceRuntimeProvider({ identity, children }) {
  const runtime = useMemo(() => ({ owner: { current: null }, watcher: { current: null }, generation: { current: 0 }, onEngineState: null, onStatus: null, voicePolicyController: null, voicePolicyConnectivity: null, voiceSelection: null }), [identity]);
  useEffect(() => () => {
    ++runtime.generation.current;
    runtime.watcher.current?.remove();
    runtime.owner.current?.stop();
    runtime.owner.current?.engine.dispose();
    runtime.voicePolicyConnectivity?.();
    runtime.voicePolicyController?.dispose();
    runtime.voicePolicyConnectivity = null;
    runtime.voicePolicyController = null;
    runtime.voiceSelection = null;
    runtime.owner.current = null;
  }, [runtime]);
  return <Context.Provider value={runtime}>{children}</Context.Provider>;
}
export function useGuidanceRuntime() { return useContext(Context); }
