import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [organization, setOrg]    = useState(null);
  const [loading, setLoading]     = useState(true);

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

  // UI-demo sign-in — sets a local mock session with NO backend call.
  // Used by the onboarding flow so the prototype can reach the main app.
  const demoLogin = async (profile = {}) => {
    const mockUser = {
      _id: 'demo-driver',
      role: 'DRIVER',
      name: 'Ramesh Yadav',
      orgId: 'demo-org',
      ...profile,
    };
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser)),
      AsyncStorage.setItem(STORAGE_KEY_TOKEN, 'demo-token'),
      AsyncStorage.setItem(STORAGE_KEY_IDENTITY, `${mockUser._id}:${mockUser.orgId}`),
    ]);
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
    setUser(null);
    setToken(null);
    setOrg(null);
    logger.info('Auth', 'User logged out — session cleared');
  };

  return (
    <AuthContext.Provider value={{ user, token, organization, loading, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
