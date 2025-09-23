import { SlashCommand, CommandCategory } from './types';

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Start a new chat',
  category: CommandCategory.CHAT,

  action: (context, args) => {
    context.clearChat();

    return {
      type: 'clear'
    };
  }
};