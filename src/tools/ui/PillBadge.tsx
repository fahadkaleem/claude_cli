import React from 'react';
import { Box, Text } from 'ink';

interface PillBadgeProps {
  statusColor: string;
  titleText: string;
}

export const PillBadge: React.FC<PillBadgeProps> = ({
  statusColor,
  titleText,
}) => (
  <Box>
    <Text color={statusColor}>{''}</Text>
    <Text color={statusColor} inverse bold>
      {titleText}
    </Text>
    <Text color={statusColor}>{''}</Text>
  </Box>
);