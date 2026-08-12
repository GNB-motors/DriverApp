import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginRequest } from '../services/api';
import logger from '../utils/logger';

const AuthContext = createContext();

const STORAGE_KEY_USER     = 'fleetedge_user';
const STORAGE_KEY_TOKEN    = 'fleetedge_token';
const STORAGE_KEY_IDENTITY = 'fleetedge_last_identity'; // "<userId>:<orgId>"

// Keys that hold per-account state. Wipe these whenever the logged-in
// identity changes or the user logs out. Add new keys here as they appear.
const PER_ACCOUNT_KEYS = [
  'fleetedge_selected_vehicle',
  // future: 'fleetedge_draft_refuel', 'fleetedge_recent_locations', etc.
];

const wipePerAccountState = () =>
  Promise.all(PER_ACCOUNT_KEYS.map((k) => AsyncStorage.removeItem(k)));

// ── Local UI-testing accounts ───────────────────────────────────────────────
// Sign in with any of these numbers and the password below to inspect a role's
// screens without a backend. Requests made with a `mock-jwt-*` token are served
// from src/services/mockFixtures.js and never leave the device.
//
// These are DEV credentials in client source. They must not reach a store build —
// gate them behind __DEV__ or strip them in the release pipeline.
const MOCK_PASSWORD = 'test1234';

const mockSession = (id, name, role, token) => ({
  user: { _id: id, name, role, orgId: 'org1' },
  token,
  organization: { _id: 'org1', companyName: 'GNB Motors' },
});

const MOCK_ACCOUNTS = {
  '9999999990': mockSession('mock_owner1', 'Test Owner', 'OWNER', 'mock-jwt-owner'),
  '9999999991': mockSession('mock_manager1', 'Test Manager', 'MANAGER', 'mock-jwt-mgr'),
  '9999999992': mockSession('mock_ops1', 'Test Ops', 'OPS_EXECUTIVE', 'mock-jwt-ops'),
  '9999999993': mockSession('mock_driver1', 'Test Driver', 'DRIVER', 'mock-jwt-driver'),
};

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [organization, setOrg]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
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
            logger.warn('Auth', 'Identity drift detected — per-account state wiped', { prev: storedIdentity, curr: currentIdentity });
          }
          setUser(parsed);
          setToken(storedToken);
          logger.info('Auth', `Session restored — role=${parsed.role} id=${parsed._id}`);
        }
      } catch (err) {
        logger.error('Auth', `Failed to restore session: ${err?.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  /**
   * Sign in with mobile number (or email) + password.
   *
   * POST /api/auth/login — the same endpoint the web portal uses. Passwords are
   * set by an Owner when creating the employee, so there is nothing to request or
   * verify first: this is a single round trip.
   *
   * The number is sent as the user typed it (bare 10 digits from the keypad). The
   * backend matches every format `User.mobileNumber` may be stored in, so no
   * client-side normalisation is needed — and doing it here would only re-create
   * the format mismatch that made correct passwords look wrong.
   */
  const login = async (mobileOrEmail, password) => {
    const identifier = String(mobileOrEmail || '').trim();

    // Local UI-testing accounts. Kept deliberately; see mockFixtures.js for the
    // canned responses that back them.
    const mock = MOCK_ACCOUNTS[identifier];
    const result = mock && password === MOCK_PASSWORD
      ? mock
      : await loginRequest(identifier, password);

    const { user: loggedInUser, token: jwt, organization: org } = result;
    const newIdentity = `${loggedInUser._id}:${loggedInUser.orgId}`;

    // If the device previously belonged to a different identity, wipe its
    // per-account state before persisting the new session.
    const prevIdentity = await AsyncStorage.getItem(STORAGE_KEY_IDENTITY);
    if (prevIdentity && prevIdentity !== newIdentity) {
      await wipePerAccountState();
    }

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(loggedInUser)),
      AsyncStorage.setItem(STORAGE_KEY_TOKEN, jwt),
      AsyncStorage.setItem(STORAGE_KEY_IDENTITY, newIdentity),
    ]);

    setUser(loggedInUser);
    setToken(jwt);
    setOrg(org);
    setIsNewLogin(true);
    logger.info('Auth', `Login success — role=${loggedInUser.role} id=${loggedInUser._id}`);
    return true;
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_USER),
      AsyncStorage.removeItem(STORAGE_KEY_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEY_IDENTITY),
      wipePerAccountState(),
    ]);
    setUser(null);
    setToken(null);
    setOrg(null);
    setIsNewLogin(false);
    logger.info('Auth', 'User logged out — session cleared');
  };

  return (
    <AuthContext.Provider value={{ user, token, organization, loading, isNewLogin, setIsNewLogin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
