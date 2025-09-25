import React from 'react';
import { Box, Text } from 'ink';
import { MessageList } from './MessageList.js';
import { Message } from '../types';
import { Colors, MessageIndicators } from '../constants.js';

interface MainContentProps {
  messages: Message[];
  isLoading: boolean;
  localMessage?: string | null;
}

export const MainContent: React.FC<MainContentProps> = ({
  messages,
  isLoading,
  localMessage
}) => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />

      {/* Display local message if present */}
      {localMessage && (
        <Box marginBottom={1}>
          <Text color={Colors.Tool.Completed}>{MessageIndicators.Tool} </Text>
          <Text>{localMessage}</Text>
        </Box>
      )}
    </Box>
  );
};