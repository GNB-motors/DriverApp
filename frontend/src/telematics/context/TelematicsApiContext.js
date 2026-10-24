import React, { createContext, useContext, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { createTelematicsApi } from "../services/telematicsApi";
const Context = createContext(null);
export function TelematicsApiProvider({ audience = "driver", children }) {
  const { user, token, invalidateSession } = useAuth();
  const service = useMemo(
    () =>
      createTelematicsApi({
        baseURL: process.env.EXPO_PUBLIC_API_URL,
        token,
        user,
        audience,
        onUnauthorized: () => invalidateSession(token),
      }),
    [token, user, audience, invalidateSession],
  );
  return <Context.Provider value={service}>{children}</Context.Provider>;
}
export function useTelematicsApi() {
  const service = useContext(Context);
  if (!service) throw new Error("TelematicsApiProvider is required");
  return service;
}
