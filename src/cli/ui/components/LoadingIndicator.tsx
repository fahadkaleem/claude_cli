import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { useTheme } from '../hooks/useTheme.js';

interface LoadingIndicatorProps {
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text = 'Thinking...'
}) => {
  const { colors } = useTheme();
  return (
    <Box>
      <Text color={colors.primary}>
        <Spinner type="dots" />
      </Text>
      <Text color={colors.secondary}> {text}</Text>
    </Box>
  );
};