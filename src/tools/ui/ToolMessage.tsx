import React from 'react';
import { Box, Text } from 'ink';
import type { ToolCall } from '../core/types.js';
import { toolRegistry } from '../core/ToolRegistry.js';
import { MessageIndicators } from '../../cli/ui/constants.js';
import { useTheme } from '../../cli/ui/hooks/useTheme.js';
import { TaskDisplay } from './TaskDisplay.js';

interface ToolMessageProps {
  toolCall: ToolCall;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ toolCall }) => {
  const { colors } = useTheme();
  // Get the tool instance to access display name and formatters
  const tool = toolRegistry.get(toolCall.name);
  const displayName = tool?.displayName || toolCall.name;
  const formattedParams = tool ? tool.formatParams(toolCall.input as Record<string, unknown>) : JSON.stringify(toolCall.input);

  const getStatusIndicator = () => {
    return MessageIndicators.Tool;
  };

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'pending':
      case 'executing':
        return colors.secondary;
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      default:
        return colors.secondary;
    }
  };

  // Check if we should hide this tool call completely
  const shouldHideToolCall = () => {
    // Hide Read File tool when reading images
    if (toolCall.name === 'read_file' && toolCall.result?.output) {
      const output = toolCall.result.output as any;
      return output && typeof output === 'object' && output.type === 'image';
    }
    return false;
  };

  // Check if we should show full display content for this tool
  const shouldShowFullDisplay = () => {
    return toolCall.name === 'write_tasks' && toolCall.result?.display?.content;
  };

  // Get one-line summary of result
  const getResultSummary = () => {
    if (!toolCall.result) return null;

    if (tool) {
      return tool.summarizeResult(toolCall.result);
    }

    // Fallback if tool not found
    if (!toolCall.result.success) {
      return `Error: ${toolCall.result.error || 'Failed'}`;
    }
    return 'Completed';
  };

  const resultSummary = getResultSummary();

  // Hide tool call completely if needed (e.g., image reads)
  if (shouldHideToolCall()) {
    return null;
  }

  // For TodoWrite tool, only show the full display content
  if (shouldShowFullDisplay() && toolCall.result?.display?.content) {
    return (
      <Box>
        <Text color={getStatusColor()}>{getStatusIndicator()} </Text>
        <TaskDisplay content={toolCall.result.display.content} />
      </Box>
    );
  }

  // For other tools, show the standard format
  return (
    <Box flexDirection="column">
      {/* Main tool call line */}
      <Box>
        <Text color={getStatusColor()}>{getStatusIndicator()} </Text>
        <Text>{displayName}({formattedParams})</Text>
      </Box>

      {/* Result summary with ⎿ branch */}
      {resultSummary && (
        <Box marginLeft={2}>
          <Text color={colors.secondary} bold>{MessageIndicators.ToolResult}  </Text>
          <Text color={colors.white}>
            {resultSummary}
          </Text>
        </Box>
      )}
    </Box>
  );
};

