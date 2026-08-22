import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';
import authService from '../services/authService';
import { setSession, clearSession, setOnUnauthorized, apiConfigured } from '../services/client';

// The offline demo login (password-less, role-from-phone) must NEVER be reachable
// in a release build. It is enabled only in dev, or when an explicit opt-in flag
// is set. A production build with no API URL fails closed instead of granting access.
const DEMO_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const AuthContext = createContext();

const STORAGE_KEY_USER     = 'fleetedge_user';
const STORAGE_KEY_TOKEN    = 'fleetedge_token';
const STORAGE_KEY_IDENTITY = 'fleetedge_last_identity'; // "<userId>:<orgId>"
const STORAGE_KEY_BRANCH   = 'fleetedge_active_branch'; // owner's selected location (null = all branches)

// Per-account state is wiped when the signed-in identity changes, so a branch
// from one org can never leak into another.
const PER_ACCOUNT_KEYS = ['fleetedge_selected_vehicle', STORAGE_KEY_BRANCH];
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
  // Owner's active location. null = "All branches" (enterprise scope). Sent as
  // X-Branch-Id on every request via the shared client, so all owner data scopes
  // to the picked branch.
  const [activeBranchId, setActiveBranchId] = useState(null);

  const persist = (u, t) =>
    Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u)),
      // Bearer token lives in the OS keychain/keystore (encrypted), never plaintext.
      SecureStore.setItemAsync(STORAGE_KEY_TOKEN, t),
      AsyncStorage.setItem(STORAGE_KEY_IDENTITY, `${u._id}:${u.orgId}`),
    ]);

  // Restore a persisted session on cold start; validate/refresh via /me when a
  // real backend is configured.
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken, storedIdentity] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USER),
          SecureStore.getItemAsync(STORAGE_KEY_TOKEN),
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
          // Restore the owner's picked branch (wiped above if the identity changed).
          const storedBranch = await AsyncStorage.getItem(STORAGE_KEY_BRANCH);
          if (storedBranch) {
            setActiveBranchId(storedBranch);
            setSession({ branchId: storedBranch });
          }
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
      // Fail closed in production: no API URL must NOT silently grant a demo session.
      if (!DEMO_ENABLED) {
        throw new Error('This app isn’t configured to reach the server. Please update the app or contact support.');
      }
      const digits = String(emailOrMobile || '').replace(/\D/g, '');
      return demoLogin({ rawPhone: digits });
    }
    const data = await authService.login(emailOrMobile, password); // throws on 401/etc
    const loggedUser = data.user;
    const jwt = data.token;
    // Fresh login starts at "All branches"; the owner can narrow it afterwards.
    setSession({ token: jwt, orgId: loggedUser?.orgId || null, branchId: null });
    setActiveBranchId(null);
    await AsyncStorage.removeItem(STORAGE_KEY_BRANCH);
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

  /**
   * Owner picks a location (or "All branches"). Updates the client header so all
   * subsequent requests scope to that branch, persists it, and updates state.
   * Pass null/'' for the enterprise (all-branches) view.
   */
  const setActiveBranch = async (branchId) => {
    const id = branchId || null;
    setActiveBranchId(id);
    setSession({ branchId: id });
    if (id) await AsyncStorage.setItem(STORAGE_KEY_BRANCH, id);
    else await AsyncStorage.removeItem(STORAGE_KEY_BRANCH);
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_USER),
      SecureStore.deleteItemAsync(STORAGE_KEY_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEY_IDENTITY),
      wipePerAccountState(),
    ]);
    clearSession();
    setUser(null);
    setToken(null);
    setOrg(null);
    setPermissions({});
    setActiveBranchId(null);
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
      value={{ user, token, organization, permissions, loading, login, demoLogin, logout, hasPerm, activeBranchId, setActiveBranch }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
