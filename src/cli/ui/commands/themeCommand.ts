import { SlashCommand, CommandCategory } from './types.js';

export const themeCommand: SlashCommand = {
  name: 'theme',
  description: 'Change the UI theme',
  category: CommandCategory.SYSTEM,
  expectsArgs: false,

  action: (context, args) => {
    return {
      type: 'dialog',
      dialog: 'theme-select'
    };
  }
};