import React from 'react';
import { Box, Text } from 'ink';
import type { ToolCall } from '../core/types.js';
import { toolRegistry } from '../core/ToolRegistry.js';

interface ToolMessageProps {
  toolCall: ToolCall;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ toolCall }) => {
  // Get the tool instance to access display name and formatters
  const tool = toolRegistry.get(toolCall.name);
  const displayName = tool?.displayName || toolCall.name;
  const formattedParams = tool ? tool.formatParams(toolCall.input) : JSON.stringify(toolCall.input);

  const getStatusIndicator = () => {
    // Using ● as the base symbol to match message dots
    return '●';
  };

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'pending':
      case 'executing':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
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
          <Text color="gray">⎿ </Text>
          <Text color={toolCall.result?.success ? 'white' : 'red'}>
            {resultSummary}
          </Text>
        </Box>
      )}
    </Box>
  );
};

