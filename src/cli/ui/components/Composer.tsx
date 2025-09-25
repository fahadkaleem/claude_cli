import React from 'react';
import { Box, Text } from 'ink';
import { InputPrompt } from './InputPrompt.js';
import { StatusBar } from './StatusBar.js';
import { Colors, MessageIndicators } from '../constants.js';

interface ComposerProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  queuedMessages?: string[];
  onClearChat?: () => void;
  onDisplayLocalMessage?: (message: string) => void;
  onAbortOperation?: () => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSubmit,
  isLoading,
  error,
  isConnected,
  queuedMessages = [],
  onClearChat,
  onDisplayLocalMessage,
  onAbortOperation
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

      <InputPrompt
        onSubmit={onSubmit}
        onClearChat={onClearChat}
        onDisplayLocalMessage={onDisplayLocalMessage}
        onAbortOperation={onAbortOperation}
        isLoading={isLoading}
      />
    </Box>
  );
};