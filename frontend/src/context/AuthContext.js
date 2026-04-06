import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestDriverOtp, verifyDriverOtp } from '../services/authService';

const AuthContext = createContext();

const STORAGE_KEY_USER  = 'fleetedge_user';
const STORAGE_KEY_TOKEN = 'fleetedge_token';

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [organization, setOrg]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  // Rehydrate session from AsyncStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_USER),
          AsyncStorage.getItem(STORAGE_KEY_TOKEN),
        ]);
        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        }
      } catch (err) {
        console.error('[Auth] Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  /**
   * Step 1 of driver OTP login.
   * Calls POST /api/auth/driver/request-otp.
   * Throws on failure so the UI can show an error.
   *
   * @param {string} mobileNumber  e.g. "9876543210" (10-digit) or "+919876543210"
   */
  const sendOtp = async (mobileNumber) => {
    // Normalise to E.164 for the API
    const normalised = mobileNumber.startsWith('+')
      ? mobileNumber
      : `+91${mobileNumber.replace(/\s/g, '')}`;
    await requestDriverOtp(normalised);
    return normalised; // return so the screen can cache it
  };

  /**
   * Step 2 of driver OTP login.
   * Calls POST /api/auth/driver/verify-otp and persists the session.
   *
   * @param {string} mobileNumber  E.164 format (returned from sendOtp)
   * @param {string} otp           6-digit string
   */
  const verifyOtp = async (mobileNumber, otp) => {
    const result = await verifyDriverOtp(mobileNumber, otp);
    const { user: loggedInUser, token: jwt, organization: org } = result;

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(loggedInUser)),
      AsyncStorage.setItem(STORAGE_KEY_TOKEN, jwt),
    ]);

    setUser(loggedInUser);
    setToken(jwt);
    setOrg(org);
    setIsNewLogin(true);
    return true;
  };

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_USER),
      AsyncStorage.removeItem(STORAGE_KEY_TOKEN),
    ]);
    setUser(null);
    setToken(null);
    setOrg(null);
    setIsNewLogin(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, organization, loading, isNewLogin, setIsNewLogin, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
