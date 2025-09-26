import * as dotenv from 'dotenv';
import { Config } from '../cli/ui/types';

// Load .env file silently (quiet option not in types but works)
dotenv.config({ silent: true } as dotenv.DotenvConfigOptions);

export const getConfig = (): Config => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY not found in environment variables.\n' +
      'Please create a .env file with your API key or set it as an environment variable.'
    );
  }

  return {
    apiKey,
    model: 'claude-3-5-haiku-latest',
    maxTokens: 4096
  };
};
//claude-sonnet-4-20250514