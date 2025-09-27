import React, { useState, useMemo, useCallback } from 'react';
import { App } from './App.js';
import { useChat } from './hooks/useChat.js';
import { useThemeCommand } from './hooks/useThemeCommand.js';
import { useToolRegistration } from './hooks/useToolRegistration.js';
import { ThemeContext } from './hooks/useTheme.js';
import { getThemeColors } from './themes/config.js';
import { UIStateContext } from './contexts/UIStateContext.js';
import { UIActionsContext } from './contexts/UIActionsContext.js';
import { DialogProvider, useDialog } from './contexts/DialogContext.js';
import { SettingsProvider } from './contexts/SettingsContext.js';
import { ShellModeProvider } from './contexts/shellModeContext.js';

interface AppContainerProps {
  model?: string;
}

const AppContainerContent: React.FC<AppContainerProps> = ({ model }) => {
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const { isConnected } = useToolRegistration();
  const { currentDialog, closeDialog } = useDialog();
  const { currentTheme, setCurrentTheme, handleThemeSelect } = useThemeCommand(closeDialog);

  const {
    messages,
    isLoading,
    error,
    queuedMessages,
    sendMessage,
    addMessageToHistory,
    clearChat,
    abortOperation
  } = useChat();

  const themeContextValue = useMemo(
    () => ({
      currentTheme,
      colors: getThemeColors(currentTheme),
      setCurrentTheme,
    }),
    [currentTheme, setCurrentTheme]
  );

  const handleSubmit = useCallback((message: string, displayMessage?: string) => {
    setLocalMessage(null);
    sendMessage(message, displayMessage);
  }, [sendMessage]);

  const handleClearChat = useCallback(() => {
    setLocalMessage(null);
    clearChat();
  }, [clearChat]);

  const uiState = useMemo(
    () => ({
      messages,
      isLoading,
      error,
      isConnected,
      queuedMessages,
      localMessage,
      currentDialog,
      model: model || 'claude-sonnet-4-20250514',
      currentTheme,
    }),
    [messages, isLoading, error, isConnected, queuedMessages, localMessage, currentDialog, model, currentTheme]
  );

  const uiActions = useMemo(
    () => ({
      handleThemeSelect,
      onSubmit: handleSubmit,
      onClearChat: handleClearChat,
      onDisplayLocalMessage: setLocalMessage,
      onAbortOperation: abortOperation,
      addMessageToHistory,
      closeDialog,
    }),
    [handleThemeSelect, handleSubmit, handleClearChat, abortOperation, addMessageToHistory, closeDialog]
  );

  return (
    <ShellModeProvider>
      <SettingsProvider>
        <ThemeContext.Provider value={themeContextValue}>
          <UIStateContext.Provider value={uiState}>
            <UIActionsContext.Provider value={uiActions}>
              <App />
            </UIActionsContext.Provider>
          </UIStateContext.Provider>
        </ThemeContext.Provider>
      </SettingsProvider>
    </ShellModeProvider>
  );
};

export const AppContainer: React.FC<AppContainerProps> = (props) => {
  return (
    <DialogProvider>
      <AppContainerContent {...props} />
    </DialogProvider>
  );
};