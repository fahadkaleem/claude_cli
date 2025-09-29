import React, { createContext, useContext } from 'react';
import type { Config } from '../../../config/Config.js';

interface ConfigContextValue {
  config: Config;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export const ConfigProvider: React.FC<{
  config: Config;
  children: React.ReactNode;
}> = ({ config, children }) => {
  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context.config;
};