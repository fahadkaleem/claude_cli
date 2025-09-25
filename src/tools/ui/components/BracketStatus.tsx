import React from 'react';
import { Box, Text } from 'ink';
import { getStatusInfo, type TaskStatus } from '../constants/taskIndicators.js';

interface BracketStatusProps {
  /** The current status to display */
  status: TaskStatus;
  /** Optional label to show next to the status */
  label?: string;
  /** Whether to show the status text */
  showText?: boolean;
}

/**
 * Displays task status using bracket notation: [ ], [◐], [✓]
 *
 * @example
 * <BracketStatus status="completed" />
 * <BracketStatus status="in_progress" label="Building project" />
 */
export const BracketStatus: React.FC<BracketStatusProps> = ({
  status,
  label,
  showText = false
}) => {
  const { indicator, color, label: statusLabel } = getStatusInfo(status);

  return (
    <Box gap={1}>
      <Text color={color} bold={status === 'in_progress'}>{indicator}</Text>
      {label && <Text color={color}>{label}</Text>}
      {showText && <Text color={color} dimColor>{statusLabel}</Text>}
    </Box>
  );
};

export type { BracketStatusProps };