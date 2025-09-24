import { SlashCommand, CommandCategory } from './types.js';

export const exitCommand: SlashCommand = {
  name: 'exit',
  description: 'Exit the application',
  category: CommandCategory.GENERAL,

  action: (context, args) => {
    // Exit the process
    process.exit(0);
  }
};