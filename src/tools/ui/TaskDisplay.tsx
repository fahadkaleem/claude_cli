import React from 'react';
import { Box, Text } from 'ink';

interface TaskDisplayProps {
  content: string;
}

/**
 * Component to display task list with proper formatting
 * Handles alignment and special formatting for task states
 */
export const TaskDisplay: React.FC<TaskDisplayProps> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => {
        // Check if this is an in-progress task (has ▶ indicator)
        const isInProgress = line.includes('▶');

        if (isInProgress) {
          // Render in-progress tasks in green
          return <Text key={index} color="green">{line}</Text>;
        }

        // Regular lines (title, pending, completed)
        return <Text key={index}>{line}</Text>;
      })}
    </Box>
  );
};