import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestDriverOtp, verifyDriverOtp } from '../services/api';
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

  const sendOtp = async (mobileNumber) => {
    const normalised = mobileNumber.startsWith('+')
      ? mobileNumber
      : `+91${mobileNumber.replace(/\s/g, '')}`;
      
    // MOCK ACCOUNTS bypass API
    if (['+919999999990', '+919999999991', '+919999999992', '+919999999993'].includes(normalised)) {
      return normalised;
    }

    await requestDriverOtp(normalised);
    return normalised;
  };

  const verifyOtp = async (mobileNumber, otp) => {
    let result;

    // MOCK ACCOUNTS for UI Testing
    if (mobileNumber === '+919999999990' && otp === '123456') {
      result = { user: { _id: 'mock_owner1', name: 'Test Owner', role: 'OWNER', orgId: 'org1', phone: '+919999999990' }, token: 'mock-jwt-owner', organization: { name: 'GNB Motors', _id: 'org1' } };
    } else if (mobileNumber === '+919999999991' && otp === '123456') {
      result = { user: { _id: 'mock_manager1', name: 'Test Manager', role: 'MANAGER', orgId: 'org1', phone: '+919999999991' }, token: 'mock-jwt-mgr', organization: { name: 'GNB Motors', _id: 'org1' } };
    } else if (mobileNumber === '+919999999992' && otp === '123456') {
      result = { user: { _id: 'mock_ops1', name: 'Test Ops', role: 'OPS_EXECUTIVE', orgId: 'org1', phone: '+919999999992' }, token: 'mock-jwt-ops', organization: { name: 'GNB Motors', _id: 'org1' } };
    } else if (mobileNumber === '+919999999993' && otp === '123456') {
      result = { user: { _id: 'mock_driver1', name: 'Test Driver', role: 'DRIVER', orgId: 'org1', phone: '+919999999993' }, token: 'mock-jwt-driver', organization: { name: 'GNB Motors', _id: 'org1' } };
    } else {
      result = await verifyDriverOtp(mobileNumber, otp);
    }

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
    <AuthContext.Provider value={{ user, token, organization, loading, isNewLogin, setIsNewLogin, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
