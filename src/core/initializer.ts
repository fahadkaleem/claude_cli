import { Config } from '../config/Config.js';
import type { ChatClient } from './ChatClient.js';

export interface InitializationResult {
  client: ChatClient;
  config: Config;
}

/**
 * Initialize the application with all services
 * Uses factory pattern following Gemini architecture
 */
export async function initializeApp(): Promise<InitializationResult> {
  // Use factory pattern to create and initialize config
  // This ensures all services are created and initialized properly
  const config = await Config.create();

  // Get the initialized chat client from config
  const client = config.getChatClient();

  return {
    client,
    config
  };
}