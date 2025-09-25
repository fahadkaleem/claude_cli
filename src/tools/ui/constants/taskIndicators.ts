/**
 * Single source of truth for task status indicators
 * Used across TaskWriteTool, TaskDisplay, and BracketStatus components
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export const TASK_STATUS_INDICATORS = {
  pending: '[ ]',
  in_progress: '[◐]',
  completed: '[✓]',
  cancelled: '[x]'
} as const;

export const TASK_STATUS_COLORS = {
  pending: 'gray',
  in_progress: 'yellow',
  completed: 'green',
  cancelled: 'red'
} as const;

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
export function getStatusInfo(status: TaskStatus) {
  return {
    indicator: TASK_STATUS_INDICATORS[status],
    color: TASK_STATUS_COLORS[status],
    label: TASK_STATUS_LABELS[status]
  };
}