import { createContext, useContext } from 'react';
import type { ThemePreset } from '../types.js';

export interface UIActions {
  handleThemeSelect: (theme: ThemePreset) => void;
  onSubmit: (message: string, displayMessage?: string) => void;
  onClearChat: () => void;
  onDisplayLocalMessage: (message: string | null) => void;
  onAbortOperation: () => void;
  addMessageToHistory: (content: string, role?: 'user' | 'assistant') => void;
  closeDialog: () => void;
  approvePermission: (permanent: boolean) => void;
  rejectPermission: () => void;
}

export const UIActionsContext = createContext<UIActions | null>(null);

export const useUIActions = () => {
  const context = useContext(UIActionsContext);
  if (!context) {
    throw new Error('useUIActions must be used within a UIActionsProvider');
  }
  return context;
};