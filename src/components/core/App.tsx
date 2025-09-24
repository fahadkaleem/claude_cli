import React, { useEffect, useState } from 'react';
import { Box, useInput } from 'ink';
import { MainContent } from './MainContent.js';
import { Composer } from './Composer.js';
import { Footer } from './Footer.js';
import { AppHeader } from './AppHeader.js';
import { useChat } from '../../hooks/useChat.js';
import { initializeClient } from '../../services/anthropic.js';
import { toolRegistry } from '../../tools/core/ToolRegistry.js';
import { WeatherTool } from '../../tools/implementations/WeatherTool.js';

interface AppProps {
  model?: string;
}

export const App: React.FC<AppProps> = ({ model }) => {
  const [isConnected, setIsConnected] = useState(false);
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
    clearChat
  } = useChat();

  useEffect(() => {
    try {
      initializeClient();

      // Register tools
      toolRegistry.register(new WeatherTool());

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