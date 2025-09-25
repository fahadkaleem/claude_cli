import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import Markdown from '@inkkit/ink-markdown';
import { Message } from '../types';
import { ToolMessage } from '../../../tools/ui/ToolMessage.js';
import { MessageIndicators, Colors, DisplayType, LoadingMessages, SpinnerType } from '../constants.js';

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
    if (message.role === 'user') {
      // User messages - keep as plain text with orange color
      messageElements.push(
        <Box key={`msg-${index}`} marginBottom={1}>
          <Text color={Colors.User}>
            {MessageIndicators.User} {message.content}
          </Text>
        </Box>
      );
    } else {
      // Assistant messages - render as markdown only if there's content
      if (message.content && message.content.trim()) {
        messageElements.push(
          <Box key={`msg-${index}`} marginBottom={1}>
            <Text color={Colors.Assistant}>{MessageIndicators.Assistant} </Text>
            <Box flexGrow={1}>
              <Markdown>{message.content}</Markdown>
            </Box>
          </Box>
        );
      }
    }

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
          <Text color={Colors.Loading}>
            <Spinner type={SpinnerType.Default} />
          </Text>
          <Text> {LoadingMessages.Thinking}</Text>
        </Box>
      )}
    </Box>
  );
};