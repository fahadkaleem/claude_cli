import type { SlashCommand, CommandActionReturn } from './types.js';
import { TaskWriteTool } from '../tools/implementations/workflow/TaskWriteTool.js';

export const tasksCommand: SlashCommand = {
  name: 'tasks',
  description: 'View or clear the current task list',
  aliases: ['task'],
  category: 'general',
  action: async (context, args): Promise<CommandActionReturn> => {
    const subcommand = args.trim().toLowerCase();

    if (subcommand === 'clear' || subcommand === 'reset') {
      TaskWriteTool.clearTodos();
      return {
        type: 'message',
        role: 'info',
        content: 'Task list cleared',
      };
    }

    // Show current tasks
    const tasks = TaskWriteTool.getTodos();

    if (tasks.length === 0) {
      return {
        type: 'message',
        role: 'info',
        content: 'No tasks currently active. The assistant will create tasks when working on complex work.',
      };
    }

    // Format tasks for display
    const sections = {
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      pending: tasks.filter(t => t.status === 'pending'),
      completed: tasks.filter(t => t.status === 'completed'),
      cancelled: tasks.filter(t => t.status === 'cancelled'),
    };

    let output = `Tasks(${tasks.length} tasks)\n`;

    // Display all tasks with checkboxes aligned under the T
    tasks.forEach(task => {
      if (task.status === 'completed') {
        output += ` ☑ \x1b[9m${task.content}\x1b[0m\n`;
      } else if (task.status === 'in_progress') {
        output += ` ▶ ${task.content}\n`;
      } else if (task.status === 'cancelled') {
        output += ` ☑ \x1b[9m${task.content}\x1b[0m (cancelled)\n`;
      } else {
        output += ` ☐ ${task.content}\n`;
      }
    });

    return {
      type: 'message',
      role: 'info',
      content: output,
    };
  },
};