import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage } from '../utils/storage';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(null); // 'en' or 'hi'
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await storage.getItem('appLanguage');
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
        await storage.setItem('appLanguage', lang);
      } else {
        await storage.removeItem('appLanguage');
      }
      setLanguage(lang);
    } catch (e) {
      console.error('Failed to save language', e);
    }
  };

  // Translation function helper
  const t = (screen, key) => {
    const lang = language && translations[language] ? language : 'en';
    if (!translations[lang] || !translations[lang][screen]) return '';
    return translations[lang][screen][key] || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, isLoaded, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
