import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../types';
export declare const initializeClient: () => Anthropic;
export declare const sendMessage: (messages: Message[]) => Promise<string>;
export declare const streamMessage: (messages: Message[], onChunk: (chunk: string) => void) => Promise<void>;
//# sourceMappingURL=anthropic.d.ts.map