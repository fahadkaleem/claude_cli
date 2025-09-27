import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import Markdown from '@inkkit/ink-markdown';
import type { ToolCall, ToolResultDisplay, TaskListDisplay, FileDiff } from '../core/types.js';
import { toolRegistry } from '../core/ToolRegistry.js';
import { useTheme } from '../../cli/ui/hooks/useTheme.js';
import type { ToolStatus } from '../core/types.js';
import { PillBadge } from './PillBadge.js';
import { TaskList } from './components/TaskList.js';
import { UnifiedDiff } from './components/UnifiedDiff.js';
import { HighlightedCode } from './components/HighlightedCode.js';
import { basename, relative } from 'path';

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

  // Check if this is a rejected permission result
  const isRejected = toolCall.result?.returnDisplay &&
    typeof toolCall.result.returnDisplay === 'object' &&
    'rejected' in toolCall.result.returnDisplay &&
    (toolCall.result.returnDisplay as any).rejected === true;

  const statusColor = useMemo(
    () => {
      // Rejected tools should be shown in grey/dimmed
      if (isRejected) {
        return colors.secondary;
      }
      return getStatusColor(toolCall.status, colors);
    },
    [toolCall.status, colors, isRejected]
  );

  const titleText = formatToolTitle(displayName, formattedParams);
  const resultDisplay = toolCall.result?.returnDisplay;

  // Parse result display for normal tools (must be before early returns to satisfy React hooks rules)
  const { description, outputLines } = useMemo(
    () => parseResultDisplay(resultDisplay),
    [resultDisplay]
  );


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

  // Check if it's a FileDiff (especially rejected writes)
  const isFileDiff = resultDisplay &&
    typeof resultDisplay === 'object' &&
    'fileDiff' in resultDisplay;

  if (isFileDiff) {
    const fileDiff = resultDisplay as FileDiff;
    return (
      <Box flexDirection="column">
        <PillBadge statusColor={statusColor} titleText={titleText} />
        <FileRejectionDisplay fileDiff={fileDiff} colors={colors} />
      </Box>
    );
  }

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
    <Text color={statusColor}>{BRANCH_INDICATOR} </Text>
    <Markdown>{description}</Markdown>
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

const FileRejectionDisplay: React.FC<{
  fileDiff: FileDiff;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ fileDiff, colors }) => {
  const cwd = process.cwd();
  const displayPath = relative(cwd, fileDiff.fileName);
  const terminalWidth = process.stdout.columns || 80;

  if (fileDiff.rejected) {
    const action = fileDiff.action || 'update';

    return (
      <Box flexDirection="column">
        <Text>
          {'  '}{BRANCH_INDICATOR}{' '}
          <Text color={colors.error}>
            User rejected {action === 'update' ? 'update' : 'write'} to{' '}
          </Text>
          <Text bold>
            {displayPath}
          </Text>
        </Text>
        {fileDiff.hunks && fileDiff.hunks.length > 0 ? (
          <Box flexDirection="column">
            {fileDiff.hunks.map((hunk, index) => (
              <Box key={index} paddingLeft={5} marginBottom={index < fileDiff.hunks!.length - 1 ? 1 : 0}>
                <UnifiedDiff patch={hunk} width={terminalWidth - 12} dim={true} />
              </Box>
            ))}
          </Box>
        ) : (
          <Box flexDirection="column" paddingLeft={5}>
            <Text color={colors.secondary}>No changes to display</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Non-rejected FileDiff (successful write)
  return (
    <Box flexDirection="column">
      <Text>
        {'  '}{BRANCH_INDICATOR}{' '}
        <Text color={colors.success}>Updated {displayPath}</Text>
      </Text>
    </Box>
  );
};

