import React from 'react';
import { Box, Text } from 'ink';
import type { TaskListDisplay } from '../../core/types.js';
import { useTheme } from '../../../cli/ui/hooks/useTheme.js';

interface TaskListProps {
  tasks: TaskListDisplay['tasks'];
}

const TASK_STATUS_INDICATORS = {
  pending: '[ ]',
  in_progress: '[◐]',
  completed: '[✓]',
  cancelled: '[x]',
};

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const { colors } = useTheme();

  const getTaskStatusColor = (status: TaskListDisplay['tasks'][0]['status']) => {
    switch (status) {
      case 'pending':
        return colors.secondary;
      case 'in_progress':
        return colors.warning;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.secondary;
    }
  };

  return (
    <Box flexDirection="column" marginLeft={1}>
      {tasks.map((task, idx) => {
        const indicator = TASK_STATUS_INDICATORS[task.status];
        const statusColor = getTaskStatusColor(task.status);
        const isStrikethrough = task.status === 'completed' || task.status === 'cancelled';

        return (
          <Box key={`task-${idx}`}>
            <Text color={statusColor}>{indicator} </Text>
            <Text
              color={task.status === 'pending' ? colors.secondary : statusColor}
              strikethrough={isStrikethrough}
              dimColor={task.status === 'pending'}
            >
              {task.content}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};