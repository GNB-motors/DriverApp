import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginDriver } from '../services/api';

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
   * Login with email/mobile + password.
   * Calls POST /api/auth/login and persists the session to AsyncStorage.
   *
   * @param {string} emailOrMobile  Email or mobile number
   * @param {string} password
   */
  const login = async (emailOrMobile, password) => {
    const result = await loginDriver(emailOrMobile, password);
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
    <AuthContext.Provider value={{ user, token, organization, loading, isNewLogin, setIsNewLogin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
