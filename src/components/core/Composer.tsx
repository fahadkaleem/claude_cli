import React from 'react';
import { Box, Text } from 'ink';
import { ChatInput } from '../input/ChatInput.js';
import { StatusBar } from '../status/StatusBar.js';
import { Colors, MessageIndicators } from '../../constants/ui.js';

interface ComposerProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  queuedMessages?: string[];
  onClearChat?: () => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSubmit,
  isLoading,
  error,
  isConnected,
  queuedMessages = [],
  onClearChat
}) => {
  return (
    <Box flexDirection="column">
      {error && <StatusBar error={error} isConnected={isConnected} />}

      {/* Show queued messages if any */}
      {queuedMessages.length > 0 && isLoading && (
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          {queuedMessages.map((msg, index) => (
            <Box key={index}>
              <Text dimColor color={Colors.User}>
                {index === 0 ? `${MessageIndicators.User} ` : '  '}{msg}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      <ChatInput
        onSubmit={onSubmit}
        onClearChat={onClearChat}
      />
    </Box>
  );
};