import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './logger';

export const storage = {
  async getItem(key, defaultValue = null) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        try {
          return JSON.parse(value);
        } catch {
          return value; // In case it's just a raw string
        }
      }
      return defaultValue;
    } catch (error) {
      logger.error('Storage', `Error reading ${key}: ${error?.message}`);
      return defaultValue;
    }
  },

  async setItem(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      logger.error('Storage', `Error saving ${key}: ${error?.message}`);
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('Storage', `Error removing ${key}: ${error?.message}`);
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      logger.error('Storage', `Error clearing storage: ${error?.message}`);
    }
  }
};
