import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewLogin, setIsNewLogin] = useState(false);

  useEffect(() => {
    // Check for stored user on mount
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to load user', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (phoneNumber, password) => {
    // In a real app, this would verify credentials via an API call
    if (phoneNumber && phoneNumber.length >= 10 && password) {
      const userData = { phoneNumber };
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setIsNewLogin(true);
      setUser(userData);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    setIsNewLogin(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isNewLogin, setIsNewLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
