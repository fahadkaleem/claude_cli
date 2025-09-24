import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Message } from '../../types';
import { ToolMessage } from '../../tools/ui/ToolMessage.js';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading
}) => {
  // Build a flat list of messages and tool calls in order
  const messageElements: React.ReactNode[] = [];

  messages.forEach((message, index) => {
    // Add the message itself
    messageElements.push(
      <Box key={`msg-${index}`} marginBottom={1}>
        <Text color={message.role === 'user' ? 'cyan' : 'white'}>
          {message.role === 'user' ? '> ' : '● '}
          {message.content}
        </Text>
      </Box>
    );

    // Add tool calls as separate items after the message
    if (message.toolCalls && message.toolCalls.length > 0) {
      message.toolCalls.forEach((toolCall, toolIndex) => {
        messageElements.push(
          <Box key={`msg-${index}-tool-${toolIndex}`} marginBottom={1}>
            <ToolMessage toolCall={toolCall} />
          </Box>
        );
      });
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      {messageElements}

      {isLoading && (
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