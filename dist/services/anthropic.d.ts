import Anthropic from '@anthropic-ai/sdk';
import { Message } from '../types';
import type { ToolCall } from '../tools/core/types.js';
export declare const initializeClient: () => Anthropic;
export type AgentStep = {
    type: 'assistant';
    content: string;
    toolCalls?: ToolCall[];
} | {
    type: 'tool-executing';
    toolCall: ToolCall;
} | {
    type: 'tool-complete';
    toolCall: ToolCall;
} | {
    type: 'thinking';
} | {
    type: 'complete';
};
export declare function executeAgentLoop(messages: Message[]): AsyncGenerator<AgentStep>;
//# sourceMappingURL=anthropic.d.ts.map