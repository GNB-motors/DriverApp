import React, { createContext, useContext, useEffect, useState } from 'react';
import { createMockTelematicsService } from '../services/mockTelematicsService';

const Context = createContext(null);
// Mount with key={`${user._id}:${user.orgId}`} at the future authenticated boundary.
export function TelematicsDemoProvider({ identity, audience = 'driver', children }) {
  const [session, setSession] = useState(null);
  useEffect(() => {
    const service = createMockTelematicsService({ identity, audience });
    setSession({ identity, audience, service });
    return () => service.dispose();
  }, [identity, audience]);
  // Never render children with the previous account's service, even for one frame.
  if (!session || session.identity !== identity || session.audience !== audience) return null;
  return <Context.Provider value={session.service}>{children}</Context.Provider>;
}
export function useTelematicsDemo() {
  const service = useContext(Context);
  if (!service) throw new Error('TelematicsDemoProvider is required');
  return service;
}
