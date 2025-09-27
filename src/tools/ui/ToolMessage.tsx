import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import Markdown from '@inkkit/ink-markdown';
import type { ToolCall, ToolResultDisplay, TaskListDisplay, FileDiff, AnsiOutput } from '../core/types.js';
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
const BRANCH_INDENT = BRANCH_INDICATOR.length + 1; // Length of "└> "

// Line limits per display type
const LINE_LIMITS = {
  ANSI: 3,
  STRING: 10,
  DEFAULT: 10,
} as const;

interface ToolMessageProps {
  toolCall: ToolCall;
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

function formatToolTitle(displayName: string, formattedParams: string): string {
  return `${displayName}(${formattedParams})`;
}

function isDisplayType<T extends { type: string }>(
  display: unknown,
  type: string
): display is T {
  return (
    typeof display === 'object' &&
    display !== null &&
    'type' in display &&
    (display as any).type === type
  );
}

function hasProperty<K extends string>(
  obj: unknown,
  prop: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({ toolCall }) => {
  const { colors } = useTheme();

  const tool = useMemo(() => toolRegistry.get(toolCall.name), [toolCall.name]);
  const displayName = tool?.displayName || toolCall.name;
  const formattedParams = useMemo(
    () => tool ? tool.formatParams(toolCall.input as Record<string, unknown>) : JSON.stringify(toolCall.input),
    [tool, toolCall.input]
  );

  // Check rejection states
  const isRejected = hasProperty(toolCall.result?.returnDisplay, 'rejected') &&
    (toolCall.result!.returnDisplay as any).rejected === true;
  const isUserRejected = toolCall.result?.userRejected === true;

  const statusColor = useMemo(
    () => {
      if (isUserRejected || isRejected) {
        return colors.secondary;
      }
      return getStatusColor(toolCall.status, colors);
    },
    [toolCall.status, colors, isRejected, isUserRejected]
  );

  const titleText = formatToolTitle(displayName, formattedParams);
  const resultDisplay = toolCall.result?.returnDisplay;

  // Route to appropriate renderer based on display type
  if (isDisplayType<TaskListDisplay>(resultDisplay, 'task-list')) {
    return <TaskListRenderer statusColor={statusColor} titleText={titleText} taskList={resultDisplay} />;
  }

  if (isDisplayType<AnsiOutput>(resultDisplay, 'ansi')) {
    return (
      <AnsiOutputRenderer
        statusColor={statusColor}
        titleText={titleText}
        ansiOutput={resultDisplay}
        colors={colors}
      />
    );
  }

  if (hasProperty(resultDisplay, 'fileDiff')) {
    return (
      <FileDiffRenderer
        statusColor={statusColor}
        titleText={titleText}
        fileDiff={resultDisplay as FileDiff}
        colors={colors}
      />
    );
  }

  if (typeof resultDisplay === 'string') {
    return (
      <StringOutputRenderer
        statusColor={statusColor}
        titleText={titleText}
        content={resultDisplay}
        colors={colors}
      />
    );
  }

  // Empty result
  return (
    <Box flexDirection="column">
      <PillBadge statusColor={statusColor} titleText={titleText} />
    </Box>
  );
};

// Specialized renderers for each display type

const TaskListRenderer: React.FC<{
  statusColor: string;
  titleText: string;
  taskList: TaskListDisplay;
}> = ({ statusColor, titleText, taskList }) => (
  <Box flexDirection="column">
    <PillBadge statusColor={statusColor} titleText={titleText} />
    <TaskList tasks={taskList.tasks} />
  </Box>
);

const AnsiOutputRenderer: React.FC<{
  statusColor: string;
  titleText: string;
  ansiOutput: AnsiOutput;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ statusColor, titleText, ansiOutput, colors }) => {
  const outputLines = ansiOutput.content.split('\n').filter(line => line.trim().length > 0);
  const maxLines = LINE_LIMITS.ANSI;
  const displayLines = outputLines.slice(0, maxLines);
  const hasMore = outputLines.length > maxLines;
  const hiddenCount = outputLines.length - maxLines;

  return (
    <Box flexDirection="column">
      <PillBadge statusColor={statusColor} titleText={titleText} />
      {displayLines.length > 0 && (
        <OutputWithBranch
          lines={displayLines}
          statusColor={statusColor}
          hasMore={hasMore}
          hiddenCount={hiddenCount}
        />
      )}
    </Box>
  );
};

const StringOutputRenderer: React.FC<{
  statusColor: string;
  titleText: string;
  content: string;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ statusColor, titleText, content, colors }) => {
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  const maxLines = LINE_LIMITS.STRING;
  const displayLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  const hiddenCount = lines.length - maxLines;

  return (
    <Box flexDirection="column">
      <PillBadge statusColor={statusColor} titleText={titleText} />
      {displayLines.length > 0 && (
        <OutputWithBranch
          lines={displayLines}
          statusColor={statusColor}
          hasMore={hasMore}
          hiddenCount={hiddenCount}
        />
      )}
    </Box>
  );
};

const FileDiffRenderer: React.FC<{
  statusColor: string;
  titleText: string;
  fileDiff: FileDiff;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ statusColor, titleText, fileDiff, colors }) => {
  const cwd = process.cwd();
  const displayPath = relative(cwd, fileDiff.fileName);
  const terminalWidth = process.stdout.columns || 80;

  if (fileDiff.rejected) {
    const action = fileDiff.action || 'update';

    return (
      <Box flexDirection="column">
        <PillBadge statusColor={statusColor} titleText={titleText} />
        <Text>
          {'  '}{BRANCH_INDICATOR}{' '}
          <Text color={colors.error}>
            User rejected {action === 'update' ? 'update' : 'write'} to{' '}
          </Text>
          <Text bold>{displayPath}</Text>
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
      <PillBadge statusColor={statusColor} titleText={titleText} />
      <Text>
        {'  '}{BRANCH_INDICATOR}{' '}
        <Text color={colors.success}>Updated {displayPath}</Text>
      </Text>
    </Box>
  );
};

// Shared component for rendering output with branch indicator
const OutputWithBranch: React.FC<{
  lines: string[];
  statusColor: string;
  hasMore: boolean;
  hiddenCount: number;
}> = ({ lines, statusColor, hasMore, hiddenCount }) => (
  <Box flexDirection="column" marginLeft={INDENT_SIZE}>
    {lines.map((line, idx) => (
      <Box key={`output-${idx}`}>
        {idx === 0 ? (
          <>
            <Text color={statusColor}>{BRANCH_INDICATOR} </Text>
            <Text>{line}</Text>
          </>
        ) : (
          <Box marginLeft={BRANCH_INDENT}>
            <Text>{line}</Text>
          </Box>
        )}
      </Box>
    ))}
    {hasMore && (
      <Box marginLeft={BRANCH_INDENT}>
        <Text dimColor>… +{hiddenCount} lines</Text>
      </Box>
    )}
  </Box>
);