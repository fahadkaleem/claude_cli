import { exitCommand } from './exitCommand';
import { clearCommand } from './clearCommand';
import { SlashCommand } from './types';

// Export all commands as an array
export const allCommands: SlashCommand[] = [
  clearCommand,
  exitCommand,
];

// Re-export types for convenience
export * from './types';