import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  model?: string;
  showFooter?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  model = 'claude-sonnet-4-20250514',
  showFooter = false
}) => {
  if (!showFooter) return null;

  return (
    <Box marginTop={1} justifyContent="space-between">
      <Text dimColor>Model: {model}</Text>
      <Text dimColor>Ctrl+C to exit</Text>
    </Box>
  );
};