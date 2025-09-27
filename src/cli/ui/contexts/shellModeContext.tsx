import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ShellExecutionConfig } from '../../../core/services/index.js';

interface ShellModeContextType {
  shellModeActive: boolean;
  setShellModeActive: (active: boolean) => void;
  shellConfig: ShellExecutionConfig;
  setShellConfig: (config: Partial<ShellExecutionConfig>) => void;
}

const ShellModeContext = createContext<ShellModeContextType | undefined>(undefined);

interface ShellModeProviderProps {
  children: ReactNode;
}

export const ShellModeProvider: React.FC<ShellModeProviderProps> = ({ children }) => {
  const [shellModeActive, setShellModeActive] = useState(false);
  const [shellConfig, setShellConfigState] = useState<ShellExecutionConfig>({
    terminalWidth: 120,
    terminalHeight: 30,
    showColor: true,
  });

  const setShellConfig = (config: Partial<ShellExecutionConfig>) => {
    setShellConfigState(prev => ({ ...prev, ...config }));
  };

  return (
    <ShellModeContext.Provider
      value={{
        shellModeActive,
        setShellModeActive,
        shellConfig,
        setShellConfig,
      }}
    >
      {children}
    </ShellModeContext.Provider>
  );
};

export const useShellMode = (): ShellModeContextType => {
  const context = useContext(ShellModeContext);
  if (!context) {
    throw new Error('useShellMode must be used within a ShellModeProvider');
  }
  return context;
};