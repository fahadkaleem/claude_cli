import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  error?: string | null;
  isConnected: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ error, isConnected }) => {
  if (error) {
    return (
      <Box borderStyle="round" borderColor="red" paddingX={1} marginY={1}>
        <Text color="red" bold>Error: </Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text color={isConnected ? 'green' : 'yellow'}>
        {isConnected ? '● Connected' : '● Connecting...'}
      </Text>
    </Box>
  );
};