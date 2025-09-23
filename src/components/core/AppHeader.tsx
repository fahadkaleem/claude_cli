import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  version?: string;
}

export const AppHeader: React.FC<HeaderProps> = () => {
  const cwd = process.cwd();

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      paddingY={0}
      marginBottom={1}
      flexDirection="column"
    >
      <Box>
        <Text color="yellow">✻</Text>
        <Text> Welcome to Claude CLI!</Text>
      </Box>
      <Text> </Text>
      <Text color="gray">  /exit to quit the application</Text>
      <Text> </Text>
      <Text color="gray">  cwd: {cwd}</Text>
    </Box>
  );
};