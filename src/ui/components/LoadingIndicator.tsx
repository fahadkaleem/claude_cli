import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface LoadingIndicatorProps {
  text?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text = 'Thinking...'
}) => {
  return (
    <Box>
      <Text color="green">
        <Spinner type="dots" />
      </Text>
      <Text> {text}</Text>
    </Box>
  );
};