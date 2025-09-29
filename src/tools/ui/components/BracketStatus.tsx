import React from 'react';
import { Box, Text } from 'ink';
import { getStatusInfo, type TaskStatus } from '../constants/taskIndicators.js';
import { useTheme } from '../../../cli/ui/hooks/useTheme.js';

interface BracketStatusProps {
  status: TaskStatus;
  label?: string;
  showText?: boolean;
}
export const BracketStatus: React.FC<BracketStatusProps> = ({
  status,
  label,
  showText = false
}) => {
  const { colors } = useTheme();
  const { indicator, color, label: statusLabel } = getStatusInfo(status, colors);

  return (
    <Box gap={1}>
      <Text color={color} bold={status === 'in_progress'}>{indicator}</Text>
      {label && <Text color={color}>{label}</Text>}
      {showText && <Text color={color} dimColor>{statusLabel}</Text>}
    </Box>
  );
};

export type { BracketStatusProps };