import React from 'react';
import { Box, Text } from 'ink';
import { MessageList } from './MessageList.js';
import { Message } from '../types';
import { Colors, MessageIndicators } from '../constants.js';

interface MainContentProps {
  messages: Message[];
  isLoading: boolean;
  localMessage?: string | null;
  hasPendingPermission?: boolean;
  client?: any;
}

export const MainContent: React.FC<MainContentProps> = ({
  messages,
  isLoading,
  localMessage,
  hasPendingPermission = false,
  client,
}) => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasPendingPermission={hasPendingPermission}
        client={client}
      />

      {/* Display local message if present (for non-abort messages) */}
      {localMessage && !localMessage.includes('\x1b[31m') && (
        <Box>
          <Text color={Colors.Tool.Completed}>{MessageIndicators.Tool} </Text>
          <Text>{localMessage}</Text>
        </Box>
      )}
    </Box>
  );
};