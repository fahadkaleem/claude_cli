"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamMessage = exports.sendMessage = exports.initializeClient = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("./config");
let client = null;
const initializeClient = () => {
    if (!client) {
        const config = (0, config_1.getConfig)();
        client = new sdk_1.default({
            apiKey: config.apiKey,
        });
    }
    return client;
};
exports.initializeClient = initializeClient;
const sendMessage = async (messages) => {
    const anthropic = (0, exports.initializeClient)();
    const config = (0, config_1.getConfig)();
    try {
        const formattedMessages = messages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
            role: msg.role,
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
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`API Error: ${error.message}`);
        }
        throw new Error('An unknown error occurred');
    }
};
exports.sendMessage = sendMessage;
const streamMessage = async (messages, onChunk) => {
    const anthropic = (0, exports.initializeClient)();
    const config = (0, config_1.getConfig)();
    try {
        const formattedMessages = messages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
            role: msg.role,
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
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`API Error: ${error.message}`);
        }
        throw new Error('An unknown error occurred');
    }
};
exports.streamMessage = streamMessage;
//# sourceMappingURL=anthropic.js.map