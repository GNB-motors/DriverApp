import React, { createContext, useContext, useRef, useState } from 'react';

const ExperienceContext = createContext(null);
export const defaultExperienceSettings = Object.freeze({ theme: 'day', simpleMode: false, orientation: 'auto', voice: true, voiceGender: 'female', voiceSpeed: 1, volume: 'normal', dataSaver: false, prompts: false });
// Fixture data lives behind an explicit, session-only preview switch. It never
// enters the API client, upload queue, storage, telemetry or customer records.
export function ExperienceProvider({ children, initialPreview = false }) {
  const [preview, updatePreview] = useState(initialPreview); const previewRef = useRef(initialPreview); const generation = useRef(0);
  const [motion, setMotion] = useState('unknown');
  const [settings, updateSettings] = useState({ ...defaultExperienceSettings });
  const [events, setEvents] = useState([]);
  const [papers, updatePapers] = useState([]);
  const [draftPages, updateDraftPages] = useState([]);
  const [consent, setConsent] = useState(false);
  const setPreview = (next) => { previewRef.current = !!next; generation.current++; updatePreview(!!next); setEvents([]); updatePapers([]); updateDraftPages([]); setConsent(false); setMotion('unknown'); };
  const requestGeneration = generation.current;
  const setPapers = (next) => { if (previewRef.current && generation.current === requestGeneration) updatePapers(next); };
  const setDraftPages = (next) => { if (previewRef.current && generation.current === requestGeneration) updateDraftPages(next); };
  const setSettings = (patch) => updateSettings(current => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) }));
  const recordEvent = (type, payload = {}) => {
    if (!previewRef.current || generation.current !== requestGeneration) return null;
    const event = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, type, payload, at: new Date().toISOString(), preview: true };
    setEvents(current => [...current.slice(-199), event]);
    return event;
  };
  const value = { preview, setPreview, motion, setMotion, settings, setSettings, events, recordEvent, papers, setPapers, draftPages, setDraftPages, consent, setConsent, connected: false };
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}
export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('ExperienceProvider is required');
  return context;
}
