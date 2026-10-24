import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestDriverOtp, verifyDriverOtp, loginWithPassword, fetchAppSession, revokeAppSession } from '../services/api';
import { subscribeSessionExpiry } from '../services/sessionEvents';
import logger from '../utils/logger';
const AuthContext = createContext();
const USER = 'fleetedge_user';
const TOKEN = 'fleetedge_token';
const IDENTITY = 'fleetedge_last_identity';
const PER_ACCOUNT = ['fleetedge_selected_vehicle'];
const identityOf = (user) => `${user._id}:${typeof user.orgId === 'object' ? user.orgId?._id : user.orgId}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [organization, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [isNewLogin, setIsNewLogin] = useState(false);
  const generation = useRef(0);
  const activeToken = useRef(null);
  const invalidateSession = useCallback(async (expectedToken) => {
    if (typeof expectedToken === 'string' && activeToken.current !== expectedToken) return;
    activeToken.current = null;
    ++generation.current;
    setUser(null); setToken(null); setOrg(null); setIsNewLogin(false); setSessionError('');
    await AsyncStorage.multiRemove([USER, TOKEN, IDENTITY, ...PER_ACCOUNT]);
  }, []);
  useEffect(() => subscribeSessionExpiry((expiredToken) => {
    invalidateSession(expiredToken).catch((error) => logger.error('Auth', error.message));
  }), [invalidateSession]);

  const restoreSession = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setSessionError('');
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN);
      if (!storedToken) return;
      const session = await fetchAppSession(storedToken);
      if (generation.current !== current) return;
      const identity = identityOf(session.user);
      const previous = await AsyncStorage.getItem(IDENTITY);
      if (previous !== identity) await AsyncStorage.multiRemove(PER_ACCOUNT);
      if (generation.current !== current) return;
      await AsyncStorage.multiSet([[USER, JSON.stringify(session.user)], [IDENTITY, identity]]);
      if (generation.current !== current) return;
      activeToken.current = storedToken;
      setUser(session.user); setToken(storedToken); setOrg(session.organization || null);
    } catch (error) {
      if (generation.current !== current) return;
      if (error.statusCode === 401 || error.statusCode === 403) await invalidateSession();
      else setSessionError('Could not verify your saved session. Check your connection and retry, or sign in again.');
    } finally { setLoading(false); }
  }, [invalidateSession]);
  useEffect(() => { restoreSession(); return () => { ++generation.current; }; }, [restoreSession]);

  const acceptSession = async (result, current) => {
    if (generation.current !== current) return false;
    if (!result?.user?._id || !result.token) throw new Error('Invalid login response.');
    const identity = identityOf(result.user);
    const previous = await AsyncStorage.getItem(IDENTITY);
    if (generation.current !== current) return false;
    if (previous !== identity) await AsyncStorage.multiRemove(PER_ACCOUNT);
    await AsyncStorage.multiSet([[USER, JSON.stringify(result.user)], [TOKEN, result.token], [IDENTITY, identity]]);
    if (generation.current !== current) return false;
    activeToken.current = result.token;
    setUser(result.user); setToken(result.token); setOrg(result.organization || null);
    setSessionError(''); setIsNewLogin(true);
    return true;
  };
  const login = async (identifier, password) => {
    const current = ++generation.current;
    return acceptSession(await loginWithPassword(identifier, password), current);
  };
  const sendOtp = async (number) => {
    const normalized = number.startsWith('+') ? number : `+91${number.replace(/\s/g, '')}`;
    await requestDriverOtp(normalized); return normalized;
  };
  const verifyOtp = async (number, otp) => {
    const current = ++generation.current;
    return acceptSession(await verifyDriverOtp(number, otp), current);
  };
  const logout = async () => {
    const currentToken = token;
    // Remove local identity immediately, even if revocation cannot reach the server.
    await invalidateSession();
    if (currentToken) {
      try { await revokeAppSession(currentToken); }
      catch (error) { logger.warn('Auth', `Local sign-out complete; server revocation failed: ${error.message}`); }
    }
  };
  return <AuthContext.Provider value={{ user, token, organization, loading, sessionError, retrySession: restoreSession, invalidateSession, isNewLogin, setIsNewLogin, sendOtp, verifyOtp, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
