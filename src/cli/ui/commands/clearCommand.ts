import { SlashCommand, CommandCategory } from './types.js';
import { clearHistory } from '../../../config/alfredConfig.js';

export const clearCommand: SlashCommand = {
  name: 'clear',
  description: 'Start a new chat',
  category: CommandCategory.CHAT,
  expectsArgs: false,

  action: async (context, args) => {
    context.clearChat();

    try {
      await clearHistory();
    } catch (error) {
      console.error('Failed to clear history:', error);
    }

    return {
      type: 'clear'
    };
  }
};