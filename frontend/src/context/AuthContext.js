import { AppState } from 'react-native';
import { stopBackground } from '../telematics/tracking/driverBackground';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestDriverOtp, verifyDriverOtp, loginWithPassword, fetchAppSession, fetchAgentOrgs, revokeAppSession, registerPushDevice, unregisterPushDevice } from '../services/api';
import { registerForPush, unregisterFromPush } from '../services/pushNotifications';
import { subscribeSessionExpiry } from '../services/sessionEvents';
import { setSession, clearSession } from '../services/client';
import logger from '../utils/logger';
import { resolveAgentSession } from '../services/agentSession';
const AuthContext = createContext();
const USER = 'fleetedge_user';
const TOKEN = 'fleetedge_token';
const orgKey = (id) => `field-agent-org:${id}`;
const IDENTITY = 'fleetedge_last_identity';
const PER_ACCOUNT = ['fleetedge_selected_vehicle'];
const identityOf = (user) => `${user._id}:${typeof user.orgId === 'object' ? user.orgId?._id : user.orgId}`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [organization, setOrg] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [isNewLogin, setIsNewLogin] = useState(false);
  const generation = useRef(0);
  const activeToken = useRef(null);
  const invalidateSession = useCallback(async (expectedToken) => {
    if (typeof expectedToken === 'string' && activeToken.current !== expectedToken) return;
    const previousToken = activeToken.current;
    activeToken.current = null;
    clearSession();
    if (previousToken) unregisterFromPush(previousToken, { unregisterDevice: unregisterPushDevice }).catch(() => {});
    ++generation.current;
    setUser(null); setToken(null); setOrg(null); setActiveOrgId(null); setIsNewLogin(false); setSessionError('');
    await Promise.all([AsyncStorage.multiRemove([USER, TOKEN, IDENTITY, ...PER_ACCOUNT]), stopBackground()]);
  }, []);
  useEffect(() => subscribeSessionExpiry((expiredToken) => {
    invalidateSession(expiredToken).catch((error) => logger.error('Auth', error.message));
  }), [invalidateSession]);

  const restoreSession = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setSessionError('');
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN);
      if (!storedToken) { await stopBackground(); return; }
      const cachedUser = JSON.parse(await AsyncStorage.getItem(USER) || 'null');
      const preferred = cachedUser?._id ? await AsyncStorage.getItem(orgKey(cachedUser._id)) : null;
      let verified;
      try { verified = await fetchAppSession(storedToken, preferred); }
      catch (error) {
        if (![400, 403].includes(error.statusCode)) throw error;
        const orgs = await fetchAgentOrgs(storedToken);
        const selected = orgs.find((row) => String(row.orgId) === preferred) || orgs[0];
        if (!selected) throw new Error('No active organisation membership.');
        verified = await fetchAppSession(storedToken, String(selected.orgId));
      }
      const session = await resolveAgentSession({ ...verified, token: storedToken }, preferred, fetchAgentOrgs, fetchAppSession);
      if (session.activeOrgId) await AsyncStorage.setItem(orgKey(session.user._id), session.activeOrgId);
      if (generation.current !== current) return;
      if (session.user.role !== 'DRIVER') await stopBackground();
      const identity = identityOf(session.user);
      const previous = await AsyncStorage.getItem(IDENTITY);
      if (previous !== identity) await AsyncStorage.multiRemove(PER_ACCOUNT);
      if (generation.current !== current) return;
      await AsyncStorage.multiSet([[USER, JSON.stringify(session.user)], [IDENTITY, identity]]);
      if (generation.current !== current) return;
      activeToken.current = storedToken;
      setSession({ token: storedToken, orgId: session.activeOrgId, branchId: null });
      setActiveOrgId(session.activeOrgId);
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
    await stopBackground();
    result = await resolveAgentSession(result, await AsyncStorage.getItem(orgKey(result.user._id)), fetchAgentOrgs, fetchAppSession);
    if (generation.current !== current) return false;
    if (result.activeOrgId) await AsyncStorage.setItem(orgKey(result.user._id), result.activeOrgId);
    const identity = identityOf(result.user);
    const previous = await AsyncStorage.getItem(IDENTITY);
    if (generation.current !== current) return false;
    if (previous !== identity) await AsyncStorage.multiRemove(PER_ACCOUNT);
    await AsyncStorage.multiSet([[USER, JSON.stringify(result.user)], [TOKEN, result.token], [IDENTITY, identity]]);
    if (generation.current !== current) return false;
    activeToken.current = result.token;
    setSession({ token: result.token, orgId: result.activeOrgId, branchId: null });
    setActiveOrgId(result.activeOrgId);
    setUser(result.user); setToken(result.token); setOrg(result.organization || null);
    setSessionError(''); setIsNewLogin(true);

    return true;
  };
  const setActiveOrg = async (requested) => {
    if (user?.role !== 'FIELD_AGENT') throw new Error('Only field agents can switch organisations.');
    const expectedToken = token;
    const requestedId = String(requested?.orgId || requested?._id || '');
    const boundOrg = typeof user.orgId === 'object' ? user.orgId?._id : user.orgId;
    if (boundOrg && String(boundOrg) !== requestedId) throw new Error('Your account belongs to a single organisation.');
    const orgs = await fetchAgentOrgs(expectedToken);
    const selected = orgs.find((row) => String(row.orgId) === requestedId);
    if (!selected) throw new Error('You are not an active member of this organisation.');
    await fetchAppSession(expectedToken, requestedId);
    if (activeToken.current !== expectedToken) return;
    await AsyncStorage.setItem(orgKey(user._id), requestedId);
    if (activeToken.current !== expectedToken) return;
    setSession({ token: expectedToken, orgId: requestedId, branchId: null });
    setActiveOrgId(requestedId);
    setOrg({ _id: requestedId, companyName: selected.companyName });
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
  useEffect(() => {
    if (!token || !['DRIVER', 'OWNER', 'MANAGER'].includes(user?.role)) return undefined;
    let current = true;
    const options = {
      registerDevice: registerPushDevice,
      unregisterDevice: unregisterPushDevice,
      isCurrent: () => current && activeToken.current === token,
    };
    const register = () => registerForPush(token, options).catch((error) => logger.warn('Push', error.message));
    register();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') register(); });
    return () => {
      current = false;
      listener.remove();
      unregisterFromPush(token, { unregisterDevice: unregisterPushDevice }).catch(() => {});
    };
  }, [token, user?.role]);
  const enableNotifications = () => registerForPush(token, { registerDevice: registerPushDevice, unregisterDevice: unregisterPushDevice, requestPermission: true, isCurrent: () => activeToken.current === token });
  const logout = async () => {
    const currentToken = token;
    // Remove push token before clearing session so the request can still authenticate.
    unregisterFromPush(currentToken, { unregisterDevice: unregisterPushDevice }).catch(() => {});
    // Remove local identity immediately, even if revocation cannot reach the server.
    await invalidateSession();
    if (currentToken) {
      try { await revokeAppSession(currentToken); }
      catch (error) { logger.warn('Auth', `Local sign-out complete; server revocation failed: ${error.message}`); }
    }
  };
  return <AuthContext.Provider value={{ user, token, organization, activeOrgId, setActiveOrg, loading, sessionError, retrySession: restoreSession, invalidateSession, isNewLogin, setIsNewLogin, sendOtp, verifyOtp, login, logout, enableNotifications }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
