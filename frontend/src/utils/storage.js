import AsyncStorage from '@react-native-async-storage/async-storage';

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
      console.error(`[Storage] Error reading ${key}:`, error);
      return defaultValue;
    }
  },

  async setItem(key, value) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`[Storage] Error saving ${key}:`, error);
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Error removing ${key}:`, error);
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
    }
  }
};
