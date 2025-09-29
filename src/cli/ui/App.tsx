import React from 'react';
import { Box, Text } from 'ink';
import { MainContent } from './components/MainContent.js';
import { Composer } from './components/Composer.js';
import { Footer } from './components/Footer.js';
import { AppHeader } from './components/AppHeader.js';
import { ThemeSelector } from './components/ThemeSelector.js';
import { PermissionDialog } from './components/PermissionDialog.js';
import { ToolConfirmationDialog } from '../components/permissions/ToolConfirmationDialog.js';
import { useUIState } from './contexts/UIStateContext.js';
import { useUIActions } from './contexts/UIActionsContext.js';

export const App: React.FC = () => {
  const state = useUIState();
  const actions = useUIActions();

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <AppHeader />

      <MainContent
        messages={state.messages}
        isLoading={state.isLoading}
        localMessage={state.localMessage}
        hasPendingPermission={!!state.pendingPermission || !!state.pendingConfirmation}
        client={state.client}
      />

      {state.currentDialog === 'theme-select' ? (
        <ThemeSelector
          onThemeSelect={actions.handleThemeSelect}
          onCancel={actions.closeDialog}
        />
      ) : state.pendingConfirmation ? (
        <ToolConfirmationDialog
          details={state.pendingConfirmation.details}
          onRespond={actions.respondToConfirmation}
        />
      ) : state.pendingPermission ? (
        <PermissionDialog
          data={state.pendingPermission.data}
          onApprove={actions.approvePermission}
          onReject={actions.rejectPermission}
        />
      ) : (
        <>
          <Composer
            onSubmit={actions.onSubmit}
            isLoading={state.isLoading}
            error={state.error}
            isConnected={state.isConnected}
            queuedMessages={state.queuedMessages}
            onClearChat={actions.onClearChat}
            onDisplayLocalMessage={actions.onDisplayLocalMessage}
            onAbortOperation={actions.onAbortOperation}
            addMessageToHistory={actions.addMessageToHistory}
          />

          <Footer
            model={state.model}
            showFooter={false}
          />
        </>
      )}
    </Box>
  );
};