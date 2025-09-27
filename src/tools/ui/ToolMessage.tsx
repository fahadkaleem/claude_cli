import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { ToolCall, ToolResultDisplay, TaskListDisplay } from '../core/types.js';
import { toolRegistry } from '../core/ToolRegistry.js';
import { useTheme } from '../../cli/ui/hooks/useTheme.js';
import type { ToolStatus } from '../core/types.js';
import { PillBadge } from './PillBadge.js';
import { TaskList } from './components/TaskList.js';

const BRANCH_INDICATOR = '└>';
const INDENT_SIZE = 3;
const DEFAULT_MAX_LINES = 10;

interface ToolMessageProps {
  toolCall: ToolCall;
  maxOutputLines?: number;
}

interface ParsedResult {
  description?: string;
  outputLines: string[];
}

function getStatusColor(status: ToolStatus, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (status) {
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
}

function parseResultDisplay(resultDisplay: ToolResultDisplay | undefined): ParsedResult {
  if (typeof resultDisplay !== 'string') {
    return { outputLines: [] };
  }

  const lines = resultDisplay.trim().split('\n');
  if (lines.length === 0) {
    return { outputLines: [] };
  }

  return {
    description: lines[0],
    outputLines: lines.slice(1).filter(line => line.length > 0),
  };
}

function formatToolTitle(displayName: string, formattedParams: string): string {
  return `${displayName}(${formattedParams})`;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({
  toolCall,
  maxOutputLines = DEFAULT_MAX_LINES,
}) => {
  const { colors } = useTheme();

  const tool = useMemo(() => toolRegistry.get(toolCall.name), [toolCall.name]);
  const displayName = tool?.displayName || toolCall.name;
  const formattedParams = useMemo(
    () => tool ? tool.formatParams(toolCall.input as Record<string, unknown>) : JSON.stringify(toolCall.input),
    [tool, toolCall.input]
  );

  const statusColor = useMemo(
    () => getStatusColor(toolCall.status, colors),
    [toolCall.status, colors]
  );

  const titleText = formatToolTitle(displayName, formattedParams);
  const resultDisplay = toolCall.result?.returnDisplay;

  const isTaskList = resultDisplay &&
    typeof resultDisplay === 'object' &&
    'type' in resultDisplay &&
    resultDisplay.type === 'task-list';

  if (isTaskList) {
    const taskList = resultDisplay as TaskListDisplay;
    return (
      <Box flexDirection="column">
        <PillBadge statusColor={statusColor} titleText={titleText} />
        <TaskList tasks={taskList.tasks} />
      </Box>
    );
  }

  const { description, outputLines } = useMemo(
    () => parseResultDisplay(resultDisplay),
    [resultDisplay]
  );

  const displayLines = outputLines.slice(0, maxOutputLines);
  const hasMore = outputLines.length > maxOutputLines;
  const hiddenCount = outputLines.length - maxOutputLines;

  return (
    <Box flexDirection="column">
      <PillBadge statusColor={statusColor} titleText={titleText} />

      {description && (
        <DescriptionLine statusColor={statusColor} description={description} />
      )}

      {displayLines.length > 0 && (
        <OutputSection
          displayLines={displayLines}
          hasMore={hasMore}
          hiddenCount={hiddenCount}
          warningColor={colors.warning}
        />
      )}
    </Box>
  );
};

const DescriptionLine: React.FC<{ statusColor: string; description: string }> = ({
  statusColor,
  description,
}) => (
  <Box marginLeft={INDENT_SIZE}>
    <Text color={statusColor}>{BRANCH_INDICATOR}</Text>
    <Text> {description}</Text>
  </Box>
);

const OutputSection: React.FC<{
  displayLines: string[];
  hasMore: boolean;
  hiddenCount: number;
  warningColor: string;
}> = ({ displayLines, hasMore, hiddenCount, warningColor }) => (
  <Box flexDirection="column" marginLeft={INDENT_SIZE}>
    {displayLines.map((line, idx) => (
      <Text key={`output-${idx}`}>{line}</Text>
    ))}
    {hasMore && (
      <Text color={warningColor}>
        ... +{hiddenCount} more line{hiddenCount !== 1 ? 's' : ''}
      </Text>
    )}
  </Box>
);

