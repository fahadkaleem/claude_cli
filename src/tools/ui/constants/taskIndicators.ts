/**
 * Single source of truth for task status indicators
 * Used across TaskWriteTool, TaskDisplay, and BracketStatus components
 */
import type { Colors } from '../../../cli/ui/types.js';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const TASK_STATUS_INDICATORS = {
  pending: '[ ]',
  in_progress: '[◐]',
  completed: '[✓]',
  cancelled: '[x]'
} as const;

// Function to get theme-based colors
export const getTaskStatusColors = (colors: Colors) => ({
  pending: colors.secondary,
  in_progress: colors.warning,
  completed: colors.success,
  cancelled: colors.error
});

export const TASK_STATUS_LABELS = {
  pending: 'PENDING',
  in_progress: 'IN PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED'
} as const;

// Helper function to get status from indicator string
export function getStatusFromIndicator(text: string): TaskStatus | null {
  for (const [status, indicator] of Object.entries(TASK_STATUS_INDICATORS)) {
    if (text.includes(indicator)) {
      return status as TaskStatus;
    }
  }
  return null;
}

// Helper function to get complete status info
export function getStatusInfo(status: TaskStatus, colors: Colors) {
  const statusColors = getTaskStatusColors(colors);
  return {
    indicator: TASK_STATUS_INDICATORS[status],
    color: statusColors[status],
    label: TASK_STATUS_LABELS[status]
  };
}