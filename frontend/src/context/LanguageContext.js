import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(null); // 'en' or 'hi'
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('appLanguage');
        if (storedLang) {
          setLanguage(storedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async (lang) => {
    try {
      if (lang) {
        await AsyncStorage.setItem('appLanguage', lang);
      } else {
        await AsyncStorage.removeItem('appLanguage');
      }
      setLanguage(lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  // Translation function helper
  const t = (screen, key) => {
    if (!language || !translations[language]) return '';
    return translations[language][screen]?.[key] || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, isLoaded, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
