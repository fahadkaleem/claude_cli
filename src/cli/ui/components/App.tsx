import React, { useEffect, useState } from 'react';
import { Box, useInput } from 'ink';
import { MainContent } from './MainContent.js';
import { Composer } from './Composer.js';
import { Footer } from './Footer.js';
import { AppHeader } from './AppHeader.js';
import { useChat } from '../hooks/useChat.js';
import { toolRegistry, fetch as fetchTools, workflow as workflowTools, filesystem as filesystemTools } from '../../../tools/index.js';

interface AppProps {
  model?: string;
}

export const App: React.FC<AppProps> = ({ model }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const {
    messages,
    isLoading,
    error,
    queuedMessages,
    sendMessage,
    clearError,
    clearChat,
    abortOperation
  } = useChat();

  useEffect(() => {
    const registerTools = async () => {
      try {
        // Auto-register all tools from categories
        await toolRegistry.autoRegister(fetchTools);
        await toolRegistry.autoRegister(workflowTools);
        await toolRegistry.autoRegister(filesystemTools);

        setIsConnected(true);
      } catch (err) {
        setIsConnected(false);
      }
    };

    registerTools();
  }, []);

  useInput((input, key) => {
    if (key.ctrl && input === 'l') {
      clearChat();
    }

    if (key.escape && error) {
      clearError();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <AppHeader />

      <MainContent
        messages={messages}
        isLoading={isLoading}
        localMessage={localMessage}
      />

      <Composer
        onSubmit={(message) => {
          setLocalMessage(null); // Clear local message when sending new message
          sendMessage(message);
        }}
        isLoading={isLoading}
        error={error}
        isConnected={isConnected}
        queuedMessages={queuedMessages}
        onClearChat={() => {
          setLocalMessage(null);
          clearChat();
        }}
        onDisplayLocalMessage={setLocalMessage}
        onAbortOperation={abortOperation}
      />

      <Footer
        model={model}
        showFooter={false}
      />
    </Box>
  );
};