import React from 'react';
import { Box } from 'ink';
import { ChatInput } from '../input/ChatInput.js';
import { StatusBar } from '../status/StatusBar.js';

interface ComposerProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  onClearChat?: () => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSubmit,
  isLoading,
  error,
  isConnected,
  onClearChat
}) => {
  return (
    <Box flexDirection="column">
      {error && <StatusBar error={error} isConnected={isConnected} />}

      <ChatInput
        onSubmit={onSubmit}
        isDisabled={isLoading}
        onClearChat={onClearChat}
      />
    </Box>
  );
};