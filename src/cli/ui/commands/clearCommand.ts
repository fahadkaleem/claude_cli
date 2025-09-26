import { SlashCommand, CommandCategory } from './types.js';

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Start a new chat',
  category: CommandCategory.CHAT,
  expectsArgs: false,

  action: (context, args) => {
    context.clearChat();

    return {
      type: 'clear'
    };
  }
};