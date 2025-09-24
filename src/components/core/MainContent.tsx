import React from 'react';
import { Box } from 'ink';
import { MessageList } from '../messages/MessageList.js';
import { Message } from '../../types';

interface MainContentProps {
  messages: Message[];
  isLoading: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  messages,
  isLoading
}) => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />
    </Box>
  );
};