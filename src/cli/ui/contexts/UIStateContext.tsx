import { createContext, useContext } from 'react';
import type { Message } from '../types.js';
import type { PermissionRequestData } from '../../../tools/core/types.js';
import type { ToolCallConfirmationDetails } from '../../../core/permissions/types.js';

export interface UIState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  queuedMessages: string[];
  localMessage: string | null;
  currentDialog: 'help' | 'settings' | 'about' | 'model' | 'theme-select' | null;
  model: string;
  currentTheme: string;
  pendingPermission: { toolId: string; data: PermissionRequestData } | null;
  pendingConfirmation: { confirmationId: string; details: ToolCallConfirmationDetails } | null;
}

export const UIStateContext = createContext<UIState | null>(null);

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};