import React, { useEffect, useState } from 'react';
import { Box, useInput } from 'ink';
import { MainContent } from './MainContent';
import { Composer } from './Composer';
import { Footer } from './Footer';
import { AppHeader } from './AppHeader';
import { useChat } from '../../hooks/useChat';
import { initializeClient } from '../../services/anthropic';

interface AppProps {
  model?: string;
}

export const App: React.FC<AppProps> = ({ model }) => {
  const [isConnected, setIsConnected] = useState(false);
  const {
    messages,
    isLoading,
    error,
    currentStreamMessage,
    sendMessage,
    clearError,
    clearChat
  } = useChat();

  useEffect(() => {
    try {
      initializeClient();
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
    }
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
        currentStreamMessage={currentStreamMessage}
        isLoading={isLoading}
      />

      <Composer
        onSubmit={sendMessage}
        isLoading={isLoading}
        error={error}
        isConnected={isConnected}
        onClearChat={clearChat}
      />

      <Footer
        model={model}
        showFooter={false}
      />
    </Box>
  );
};