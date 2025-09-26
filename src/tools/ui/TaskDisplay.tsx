import React from 'react';
import { Box, Text } from 'ink';
import { getStatusFromIndicator, getTaskStatusColors } from './constants/taskIndicators.js';
import { useTheme } from '../../cli/ui/hooks/useTheme.js';

interface TaskDisplayProps {
  content: string;
}

/**
 * Component to display task list with proper formatting
 * Handles alignment and special formatting for task states
 */
export const TaskDisplay: React.FC<TaskDisplayProps> = ({ content }) => {
  const { colors } = useTheme();
  const statusColors = getTaskStatusColors(colors);
  const lines = content.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => {
        // Get the task status from the line content
        const status = getStatusFromIndicator(line);

        if (status) {
          // Get the color for this status
          const color = statusColors[status];

          // Special handling for different statuses
          if (status === 'pending') {
            return <Text key={index} dimColor>{line}</Text>;
          }

          return <Text key={index} color={color}>{line}</Text>;
        }

        // Regular lines (title, etc)
        return <Text key={index}>{line}</Text>;
      })}
    </Box>
  );
};