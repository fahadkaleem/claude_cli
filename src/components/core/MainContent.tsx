import React from 'react';
import { Box } from 'ink';
import { MessageList } from '../messages/MessageList';
import { Message } from '../../types';

interface MainContentProps {
  messages: Message[];
  currentStreamMessage: string;
  isLoading: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  messages,
  currentStreamMessage,
  isLoading
}) => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      <MessageList
        messages={messages}
        currentStreamMessage={currentStreamMessage}
        isLoading={isLoading}
      />
    </Box>
  );
};