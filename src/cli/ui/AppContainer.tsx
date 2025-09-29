import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text } from 'ink';
import { App } from './App.js';
import { useChat } from './hooks/useChat.js';
import { ChatClient } from '../../core/ChatClient.js';
import { Config } from '../../config/Config.js';
import { useThemeCommand } from './hooks/useThemeCommand.js';
import { ThemeContext } from './hooks/useTheme.js';
import { getThemeColors } from './themes/config.js';
import { UIStateContext } from './contexts/UIStateContext.js';
import { UIActionsContext } from './contexts/UIActionsContext.js';
import { DialogProvider, useDialog } from './contexts/DialogContext.js';
import { SettingsProvider } from './contexts/SettingsContext.js';
import { ShellModeProvider } from './contexts/shellModeContext.js';
import { PermissionProvider, usePermission } from './contexts/PermissionContext.js';
import { PermissionDialog } from './components/PermissionDialog.js';
import { ConfigProvider } from './contexts/ConfigContext.js';

interface AppContainerProps {
  model?: string;
  client: ChatClient;
  config: Config;
}

const AppContainerContent: React.FC<AppContainerProps> = ({ model, client, config }) => {
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // Tools are now registered in Config during initialization
  const isConnected = true; // Always true since initialization happens before UI
  const { currentDialog, closeDialog } = useDialog();
  const { currentTheme, setCurrentTheme, handleThemeSelect } = useThemeCommand(closeDialog);
  const { pendingPermission, pendingConfirmation, approvePermission, rejectPermission, respondToConfirmation } = usePermission();

  const {
    messages,
    isLoading,
    error,
    queuedMessages,
    sendMessage,
    addMessageToHistory,
    clearChat,
    abortOperation,
    client: chatClient
  } = useChat(client, config);

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
      error: error,
      isConnected,
      queuedMessages,
      localMessage,
      currentDialog,
      model: model || config.getModel(),
      currentTheme,
      pendingPermission,
      pendingConfirmation,
      client: chatClient,
    }),
    [messages, isLoading, error, isConnected, queuedMessages, localMessage, currentDialog, model, config, currentTheme, pendingPermission, pendingConfirmation, chatClient]
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
      approvePermission,
      rejectPermission,
      respondToConfirmation,
    }),
    [handleThemeSelect, handleSubmit, handleClearChat, abortOperation, addMessageToHistory, closeDialog, approvePermission, rejectPermission, respondToConfirmation]
  );

  // Since we fail fast now, initialization errors are handled before rendering

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
  // Since we fail fast now, initialization errors are handled before rendering

  return (
    <ConfigProvider config={props.config}>
      <DialogProvider>
        <PermissionProvider>
          <AppContainerContent {...props} />
        </PermissionProvider>
      </DialogProvider>
    </ConfigProvider>
  );
};