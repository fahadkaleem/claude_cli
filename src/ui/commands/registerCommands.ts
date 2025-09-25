import { commandService } from '../../services/CommandService.js';
import { allCommands } from './index.js';

/**
 * Register all built-in commands with the command service
 */
export function registerBuiltInCommands() {
  commandService.registerCommands(allCommands);

  console.debug(`Registered ${allCommands.length} built-in commands`);

  return commandService;
}