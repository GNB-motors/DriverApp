import React, { createContext, useState, useEffect, useContext } from 'react';
import { storage } from '../utils/storage';
import { translations } from '../i18n/translations';
import logger from '../utils/logger';

const LanguageContext = createContext();
const ONBOARDING_KEY = 'onboardingComplete';

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(null); // 'en' or 'hi'
  const [onboarded, setOnboarded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const [storedLang, storedOnboarded] = await Promise.all([
          storage.getItem('appLanguage'),
          storage.getItem(ONBOARDING_KEY),
        ]);
        if (storedLang) {
          setLanguage(storedLang);
        }
        // Installs from before this flag picked their language during onboarding.
        setOnboarded(storedOnboarded === true || !!storedLang);
      } catch (e) {
        logger.error('Language', `Failed to load language: ${e?.message}`);
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
      logger.error('Language', `Failed to save language: ${e?.message}`);
    }
  };

  // Survives logout, so a returning user lands straight on sign in.
  const completeOnboarding = async () => {
    setOnboarded(true);
    await storage.setItem(ONBOARDING_KEY, true);
  };

  // Translation function helper
  const t = (screen, key) => {
    const lang = language && translations[language] ? language : 'en';
    if (!translations[lang] || !translations[lang][screen]) return '';
    return translations[lang][screen][key] || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, isLoaded, onboarded, completeOnboarding, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
