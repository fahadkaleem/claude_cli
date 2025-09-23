import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import { claudeAsciiLogo, claudeShortLogo, claudeTinyLogo } from './AsciiArt';

interface HeaderProps {
  version?: string;
}

const getAsciiArtWidth = (art: string): number => {
  const lines = art.split('\n').filter(line => line.length > 0);
  return Math.max(...lines.map(line => line.length));
};

export const AppHeader: React.FC<HeaderProps> = ({ version = '1.0.0' }) => {
  const terminalWidth = process.stdout.columns || 80;

  let displayLogo: string;
  const widthOfFullLogo = getAsciiArtWidth(claudeAsciiLogo);
  const widthOfShortLogo = getAsciiArtWidth(claudeShortLogo);

  if (terminalWidth >= widthOfFullLogo) {
    displayLogo = claudeAsciiLogo;
  } else if (terminalWidth >= widthOfShortLogo) {
    displayLogo = claudeShortLogo;
  } else {
    displayLogo = claudeTinyLogo;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Gradient colors={['#E76F51', '#F4A261', '#FFFFFF']}>
        <Text>{displayLogo}</Text>
      </Gradient>
      <Box justifyContent="flex-end">
        <Text color="gray" dimColor>v{version}</Text>
      </Box>
    </Box>
  );
};