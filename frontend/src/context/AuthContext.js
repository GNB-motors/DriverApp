import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import authService from '../services/authService';
import { setSession, clearSession, setOnUnauthorized, apiConfigured } from '../services/client';

const AuthContext = createContext();

const STORAGE_KEY_USER     = 'fleetedge_user';
const STORAGE_KEY_TOKEN    = 'fleetedge_token';
const STORAGE_KEY_IDENTITY = 'fleetedge_last_identity'; // "<userId>:<orgId>"

const PER_ACCOUNT_KEYS = ['fleetedge_selected_vehicle'];
const wipePerAccountState = () => Promise.all(PER_ACCOUNT_KEYS.map((k) => AsyncStorage.removeItem(k)));

// Demo phone → role map. Used ONLY when no backend URL is configured
// (EXPO_PUBLIC_API_URL unset), so the prototype still runs offline.
const DEMO_NUMBERS = {
  '9938250123': { role: 'OWNER', _id: 'demo-owner', name: 'Suresh Rao', orgId: 'demo-org' },
  '6371640884': { role: 'DRIVER', _id: 'demo-driver', name: 'Ramesh Yadav', orgId: 'demo-org' },
  '8319353177': { role: 'MANAGER', _id: 'demo-manager', name: 'Priya Deshmukh', orgId: 'demo-org' },
};
const resolveDemoProfile = (rawPhone) =>
  DEMO_NUMBERS[rawPhone] || { role: 'DRIVER', _id: 'demo-driver', name: 'Ramesh Yadav', orgId: 'demo-org' };

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [token, setToken]           = useState(null);
  const [organization, setOrg]      = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading]       = useState(true);

  const persist = (u, t) =>
    Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u)),
      AsyncStorage.setItem(STORAGE_KEY_TOKEN, t),
      AsyncStorage.setItem(STORAGE_KEY_IDENTITY, `${u._id}:${u.orgId}`),
    ]);

  // Restore a persisted session on cold start; validate/refresh via /me when a
  // real backend is configured.
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken, storedIdentity] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USER),
          AsyncStorage.getItem(STORAGE_KEY_TOKEN),
          AsyncStorage.getItem(STORAGE_KEY_IDENTITY),
        ]);
        if (storedUser && storedToken) {
          const parsed = JSON.parse(storedUser);
          const currentIdentity = `${parsed._id}:${parsed.orgId}`;
          if (storedIdentity && storedIdentity !== currentIdentity) {
            await wipePerAccountState();
            await AsyncStorage.setItem(STORAGE_KEY_IDENTITY, currentIdentity);
          }
          setUser(parsed);
          setToken(storedToken);
          setSession({ token: storedToken, orgId: parsed.orgId || null });
          logger.info('Auth', `Session restored — role=${parsed.role} id=${parsed._id}`);

          if (apiConfigured() && storedToken !== 'demo-token') {
            try {
              const me = await authService.getMe();
              if (me?.user) {
                setUser(me.user);
                setOrg(me.organization || null);
                setPermissions(me.permissions || {});
                await persist(me.user, storedToken);
              }
            } catch (err) {
              // 401 → interceptor already triggered logout; other errors: keep cached session.
              logger.warn('Auth', `Session refresh failed: ${err?.message}`);
            }
          }
        }
      } catch (err) {
        logger.error('Auth', `Failed to restore session: ${err?.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * Real login — email OR mobile + password (all roles). Falls back to the
   * offline demo role-map when no backend URL is configured.
   */
  const login = async (emailOrMobile, password) => {
    if (!apiConfigured()) {
      const digits = String(emailOrMobile || '').replace(/\D/g, '');
      return demoLogin({ rawPhone: digits });
    }
    const data = await authService.login(emailOrMobile, password); // throws on 401/etc
    const loggedUser = data.user;
    const jwt = data.token;
    setSession({ token: jwt, orgId: loggedUser?.orgId || null });
    await persist(loggedUser, jwt);
    setUser(loggedUser);
    setToken(jwt);
    setOrg(data.organization || null);
    setPermissions(data.permissions || {});
    logger.info('Auth', `Login success — role=${loggedUser?.role} id=${loggedUser?._id}`);
    return true;
  };

  // Offline demo sign-in (no backend). Role derived from the phone number.
  const demoLogin = async ({ rawPhone, ...profile } = {}) => {
    const mockUser = { ...resolveDemoProfile(rawPhone), ...profile };
    setSession({ token: 'demo-token', orgId: mockUser.orgId });
    await persist(mockUser, 'demo-token');
    setUser(mockUser);
    setToken('demo-token');
    logger.info('Auth', 'Demo UI login (no backend)');
    return true;
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_USER),
      AsyncStorage.removeItem(STORAGE_KEY_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEY_IDENTITY),
      wipePerAccountState(),
    ]);
    clearSession();
    setUser(null);
    setToken(null);
    setOrg(null);
    setPermissions({});
    logger.info('Auth', 'User logged out — session cleared');
  };

  // Fire logout on any 401 surfaced by the client.
  useEffect(() => {
    setOnUnauthorized(() => { logout(); });
    return () => setOnUnauthorized(null);
  }, []);

  const hasPerm = (key) => user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN' || permissions?.[key] === true;

  return (
    <AuthContext.Provider
      value={{ user, token, organization, permissions, loading, login, demoLogin, logout, hasPerm }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
