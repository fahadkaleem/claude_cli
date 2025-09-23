import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../types';
import { getConfig } from './config';

let client: Anthropic | null = null;

export const initializeClient = () => {
  if (!client) {
    const config = getConfig();
    client = new Anthropic({
      apiKey: config.apiKey,
    });
  }
  return client;
};

export const sendMessage = async (messages: Message[]): Promise<string> => {
  const anthropic = initializeClient();
  const config = getConfig();

  try {
    const formattedMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      messages: formattedMessages,
    });

    if (response.content[0].type === 'text') {
      return response.content[0].text;
    }

    return 'Received non-text response';
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred');
  }
};

export const streamMessage = async (
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<void> => {
  const anthropic = initializeClient();
  const config = getConfig();

  try {
    const formattedMessages = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    const stream = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      messages: formattedMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        onChunk(chunk.delta.text);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`API Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred');
  }
};