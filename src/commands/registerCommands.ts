import { commandService } from '../services/CommandService';
import { allCommands } from './index';

/**
 * Register all built-in commands with the command service
 */
export function registerBuiltInCommands() {
  commandService.registerCommands(allCommands);

  console.debug(`Registered ${allCommands.length} built-in commands`);

  return commandService;
}