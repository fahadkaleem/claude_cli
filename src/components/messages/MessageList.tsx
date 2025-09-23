import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Message } from '../../types';

interface MessageListProps {
  messages: Message[];
  currentStreamMessage?: string;
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentStreamMessage,
  isLoading
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {messages.map((message, index) => (
        <Box key={index} marginBottom={1} flexDirection="column">
          <Box>
            <Text color={message.role === 'user' ? 'cyan' : 'white'}>
              {message.role === 'user' ? '> ' : '● '}
              {message.content}
            </Text>
          </Box>
        </Box>
      ))}

      {isLoading && currentStreamMessage && (
        <Box marginBottom={1}>
          <Text color="white">
            ● {currentStreamMessage}
            <Text color="yellow"> ▊</Text>
          </Text>
        </Box>
      )}

      {isLoading && !currentStreamMessage && (
        <Box>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Text> Thinking...</Text>
        </Box>
      )}
    </Box>
  );
};