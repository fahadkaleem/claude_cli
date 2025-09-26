import React, { createContext, useContext, useState } from 'react';

export type ThinkingAnimationStyle = 'default' | 'braille' | 'japanese';

interface Settings {
  showFooter: boolean;
  showHeader: boolean;
  model: string;
  thinkingAnimationStyle: ThinkingAnimationStyle;
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  showFooter: false,
  showHeader: false,
  model: 'claude-sonnet-4-20250514',
  thinkingAnimationStyle: 'braille'
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};