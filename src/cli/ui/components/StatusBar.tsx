import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

interface StatusBarProps {
  error?: string | null;
  isConnected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ error, isConnected }) => {
  const { colors } = useTheme();
  if (error) {
    return (
      <Box borderStyle="round" borderColor={colors.error} paddingX={1} marginY={1}>
        <Text color={colors.error} bold>Error: </Text>
        <Text color={colors.error}>{error}</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text color={isConnected ? colors.success : colors.warning}>
        {isConnected ? '● Connected' : '● Connecting...'}
      </Text>
    </Box>
  );
};