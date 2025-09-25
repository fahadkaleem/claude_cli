import { SlashCommand } from '../cli/ui/commands/types.js';

/**
 * Service for managing and registering slash commands
 */
export class CommandService {
  private commands: SlashCommand[] = [];
  private commandMap: Map<string, SlashCommand> = new Map();

  /**
   * Register a single command
   */
  registerCommand(command: SlashCommand) {
    this.commands.push(command);
    this.commandMap.set(command.name, command);

    // Also register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commandMap.set(alias, command);
      });
    }
  }

  /**
   * Register multiple commands at once
   */
  registerCommands(commands: SlashCommand[]) {
    commands.forEach(cmd => this.registerCommand(cmd));
  }

  /**
   * Get all registered commands
   */
  getCommands(): SlashCommand[] {
    return this.commands;
  }

  /**
   * Get a command by name or alias
   */
  getCommand(name: string): SlashCommand | undefined {
    return this.commandMap.get(name);
  }

  /**
   * Parse a command string and return the command and arguments
   */
  parseCommand(input: string): {
    command: SlashCommand | undefined;
    args: string;
    commandPath: string[];
  } {
    const trimmed = input.trim();

    if (!trimmed.startsWith('/')) {
      return { command: undefined, args: '', commandPath: [] };
    }

    const parts = trimmed.substring(1).split(/\s+/);
    const commandPath: string[] = [];
    let currentCommand: SlashCommand | undefined;
    let commands = this.commands;
    let pathIndex = 0;

    // Navigate through command hierarchy
    for (const part of parts) {
      const found = commands.find(
        cmd => cmd.name === part || cmd.aliases?.includes(part)
      );

      if (found) {
        currentCommand = found;
        commandPath.push(found.name);
        pathIndex++;

        if (found.subCommands) {
          commands = found.subCommands;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const args = parts.slice(pathIndex).join(' ');

    return {
      command: currentCommand,
      args,
      commandPath
    };
  }

  /**
   * Get command suggestions based on partial input
   */
  getSuggestions(input: string): SlashCommand[] {
    if (!input.startsWith('/')) {
      return [];
    }

    const query = input.substring(1).toLowerCase();

    if (!query) {
      // Show all top-level commands
      return this.commands.filter(cmd => !cmd.hidden);
    }

    // Parse to see if we're in a subcommand context
    const { command, commandPath } = this.parseCommand(input);

    if (command && command.subCommands && input.endsWith(' ')) {
      // Show subcommands
      return command.subCommands.filter(cmd => !cmd.hidden);
    }

    // Filter commands that start with the query
    const suggestions = this.commands.filter(cmd => {
      if (cmd.hidden) return false;

      // Check main name
      if (cmd.name.toLowerCase().startsWith(query)) return true;

      // Check aliases
      if (cmd.aliases) {
        return cmd.aliases.some(alias =>
          alias.toLowerCase().startsWith(query)
        );
      }

      return false;
    });

    return suggestions;
  }

  /**
   * Check if the input is a perfect match for a command
   */
  isPerfectMatch(input: string): boolean {
    if (!input.startsWith('/')) {
      return false;
    }

    const commandName = input.substring(1).split(' ')[0].toLowerCase();

    // Check if it's an exact match for any command name or alias
    return this.commands.some(cmd => {
      if (cmd.name.toLowerCase() === commandName) return true;
      if (cmd.aliases) {
        return cmd.aliases.some(alias => alias.toLowerCase() === commandName);
      }
      return false;
    });
  }
}

// Singleton instance
export const commandService = new CommandService();