import { exitCommand } from './exitCommand.js';
import { clearCommand } from './clearCommand.js';
import { themeCommand } from './themeCommand.js';
import { SlashCommand } from './types.js';

// Export all commands as an array
export const allCommands: SlashCommand[] = [
  clearCommand,
  exitCommand,
  themeCommand,
];

// Re-export types for convenience
export * from './types.js';