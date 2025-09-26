import { ReactNode } from 'react';

/**
 * Context provided to command actions
 */
export interface CommandContext {
  // Add a message to the chat
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
  // Clear the chat history
  clearChat: () => void;
  // Send a message to the AI assistant
  sendToAI: (message: string) => void;
  // Current settings
  settings?: {
    model: string;
    showFooter: boolean;
    showHeader: boolean;
  };
}

/**
 * Return types for command actions
 */
export interface MessageActionReturn {
  type: 'message';
  role: 'system' | 'error' | 'info';
  content: string;
}

export interface ClearActionReturn {
  type: 'clear';
}

export interface PromptActionReturn {
  type: 'prompt';
  content: string;
}

export interface DialogActionReturn {
  type: 'dialog';
  dialog: 'help' | 'settings' | 'about' | 'model' | 'theme-select';
}

export type CommandActionReturn =
  | MessageActionReturn
  | ClearActionReturn
  | PromptActionReturn
  | DialogActionReturn
  | void;

/**
 * The main command interface
 */
export interface SlashCommand {
  // Primary command name (e.g., "help", "clear")
  name: string;

  // Alternative names/aliases (e.g., ["h", "?"] for help)
  aliases?: string[];

  // Description shown in suggestions
  description: string;

  // Category for grouping (e.g., "general", "chat", "settings")
  category?: string;

  // Whether to hide from suggestions
  hidden?: boolean;

  // Whether this command expects arguments (for smart Enter behavior)
  expectsArgs?: boolean;

  // The action to execute
  action?: (
    context: CommandContext,
    args: string
  ) => CommandActionReturn | Promise<CommandActionReturn>;

  // Sub-commands (e.g., /chat save, /chat load)
  subCommands?: SlashCommand[];

  // For dynamic argument completion
  getCompletions?: (
    context: CommandContext,
    partialArg: string
  ) => Promise<string[]>;
}

/**
 * Command categories for organization
 */
export enum CommandCategory {
  GENERAL = 'general',
  CHAT = 'chat',
  SETTINGS = 'settings',
  DEBUG = 'debug',
  HELP = 'help',
  SYSTEM = 'system'
}