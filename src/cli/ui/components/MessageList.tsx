import React from 'react';
import { Box, Text } from 'ink';
import Markdown from '@inkkit/ink-markdown';
import { Message } from '../types';
import { ToolMessage } from '../../../tools/ui/ToolMessage.js';
import { ToolCall, ToolStatus } from '../../../tools/core/types.js';
import { MessageIndicators, Colors, DisplayType, LoadingMessages, InterruptedIndicator } from '../constants.js';
import { ThinkingAnimation } from '../../../ui/components/ThinkingAnimation.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { useTheme } from '../hooks/useTheme.js';
import { extractTextContent, extractToolUseBlocks } from '../utils/messageUtils.js';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  hasPendingPermission?: boolean;
  client?: any; // AnthropicClient instance for getting tool results
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
  isLoading,
  hasPendingPermission = false,
  client,
}) => {
  const { settings } = useSettings();
  const { colors } = useTheme();
  // Build a flat list of messages and tool calls in order
  const messageElements: React.ReactNode[] = [];

  messages.forEach((message, index) => {
    // Generate unique key for this message
    const messageKey = `msg-${index}-${message.timestamp?.getTime() || Date.now()}`;

    // Add the message itself
    if (message.role === 'user') {
      // Use displayContent if available (with placeholders), otherwise use content
      const contentToDisplay = message.displayContent || extractTextContent(message.content);

      // Skip rendering user messages that only contain tool_result blocks (no actual text)
      // These are internal API messages, not user messages
      if (!contentToDisplay || contentToDisplay.trim() === '') {
        // This is a tool_result message, skip displaying it
        // (Tools display their results in the tool UI component instead)
      } else {
        const { isInterrupted, mainContent, interruptLine } = parseInterruptedMessage(contentToDisplay);

        if (isInterrupted) {
          // Display user message with interrupted indicator
          messageElements.push(
            <Box key={`${messageKey}-interrupted`} marginBottom={1} flexDirection="column">
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
            <Box key={messageKey} marginBottom={1}>
              <Text color={Colors.User}>
                {MessageIndicators.User} {contentToDisplay}
              </Text>
            </Box>
          );
        }
      }
    } else if (message.role === 'system') {
      // System messages - show as error with system indicator, indented
      const systemContent = extractTextContent(message.content);
      messageElements.push(
        <Box key={messageKey}>
          <Text color={Colors.Error}>
            {'  '}{MessageIndicators.System}  {systemContent}
          </Text>
        </Box>
      );
    } else {
      // Assistant messages - render as markdown only if there's content
      const assistantContent = extractTextContent(message.content);
      if (assistantContent && assistantContent.trim()) {
        const { isInterrupted, mainContent, interruptLine } = parseInterruptedMessage(assistantContent);

        if (isInterrupted) {
          // Display assistant message with interrupted indicator
          messageElements.push(
            <Box key={`${messageKey}-interrupted`} marginBottom={1} flexDirection="column">
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
            <Box key={messageKey} marginBottom={1}>
              <Text color={Colors.Assistant}>{MessageIndicators.Assistant} </Text>
              <Box flexGrow={1}>
                <Markdown>{mainContent}</Markdown>
              </Box>
            </Box>
          );
        }
      }
    }

    // Extract and display tool_use blocks from ContentBlock[]
    const toolUseBlocks = extractToolUseBlocks(message.content);
    if (toolUseBlocks.length > 0 && client) {
      toolUseBlocks.forEach((toolBlock, toolIndex) => {
        // Get full tool result with returnDisplay from client
        const toolResult = client.getToolResult(toolBlock.id);

        const toolCall: ToolCall = {
          id: toolBlock.id,
          name: toolBlock.name,
          input: toolBlock.input,
          status: toolResult?.error ? ToolStatus.Failed : ToolStatus.Completed,
          result: toolResult // Full ToolResult with llmContent + returnDisplay
        };

        messageElements.push(
          <Box key={`${messageKey}-tool-${toolIndex}`} marginBottom={1}>
            <ToolMessage toolCall={toolCall} />
          </Box>
        );
      });
    }
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      {messageElements}

      {isLoading && !hasPendingPermission && (
        <Box>
          <ThinkingAnimation
            size={24}
            label={LoadingMessages.Thinking}
            labelColor={colors.primary}
            gradColorA={colors.primary}
            gradColorB={colors.info}
            cycleColors={true}
            runeSet={settings.thinkingAnimationStyle}
          />
        </Box>
      )}
    </Box>
  );
};