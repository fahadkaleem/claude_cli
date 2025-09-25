import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import Markdown from '@inkkit/ink-markdown';
import { Message } from '../types';
import { ToolMessage } from '../../../tools/ui/ToolMessage.js';
import { MessageIndicators, Colors, DisplayType, LoadingMessages, SpinnerType, InterruptedIndicator } from '../constants.js';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

// Helper to check and split interrupted messages
const parseInterruptedMessage = (content: string): { isInterrupted: boolean; mainContent: string; interruptLine: string } => {
  const lines = content.split('\n');
  const lastLine = lines[lines.length - 1];
  const isInterrupted = lines.length > 1 && lastLine.includes(InterruptedIndicator);

  return {
    isInterrupted,
    mainContent: isInterrupted ? lines.slice(0, -1).join('\n') : content,
    interruptLine: isInterrupted ? lastLine : ''
  };
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading
}) => {
  // Build a flat list of messages and tool calls in order
  const messageElements: React.ReactNode[] = [];

  messages.forEach((message, index) => {
    // Add the message itself
    if (message.role === 'user') {
      const { isInterrupted, mainContent, interruptLine } = parseInterruptedMessage(message.content);

      if (isInterrupted) {
        // Display user message with interrupted indicator
        messageElements.push(
          <Box key={`msg-${index}`} marginBottom={1} flexDirection="column">
            <Text color={Colors.User}>
              {MessageIndicators.User} {mainContent}
            </Text>
            <Text color={Colors.Error}>
              {interruptLine}
            </Text>
          </Box>
        );
      } else {
        // Normal user message
        messageElements.push(
          <Box key={`msg-${index}`} marginBottom={1}>
            <Text color={Colors.User}>
              {MessageIndicators.User} {message.content}
            </Text>
          </Box>
        );
      }
    } else if (message.role === 'system') {
      // System messages - show as error with system indicator, indented
      messageElements.push(
        <Box key={`msg-${index}`}>
          <Text color={Colors.Error}>
            {'  '}{MessageIndicators.System}  {message.content}
          </Text>
        </Box>
      );
    } else {
      // Assistant messages - render as markdown only if there's content
      if (message.content && message.content.trim()) {
        const { isInterrupted, mainContent, interruptLine } = parseInterruptedMessage(message.content);

        if (isInterrupted) {
          // Display assistant message with interrupted indicator
          messageElements.push(
            <Box key={`msg-${index}`} marginBottom={1} flexDirection="column">
              <Box>
                <Text color={Colors.Assistant}>{MessageIndicators.Assistant} </Text>
                <Box flexGrow={1}>
                  <Markdown>{mainContent}</Markdown>
                </Box>
              </Box>
              <Text color={Colors.Error}>
                {interruptLine}
              </Text>
            </Box>
          );
        } else {
          // Normal assistant message
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