import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from './config.js';
import { toolRegistry } from '../tools/core/ToolRegistry.js';
import { toolExecutor } from '../tools/core/ToolExecutor.js';
let client = null;
export const initializeClient = () => {
    if (!client) {
        const config = getConfig();
        client = new Anthropic({
            apiKey: config.apiKey,
        });
    }
    return client;
};
export async function* executeAgentLoop(messages) {
    const anthropic = initializeClient();
    const config = getConfig();
    // Convert our message format to Anthropic's format
    const formattedMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
        role: msg.role,
        content: msg.content
    }));
    // Get registered tools
    const tools = toolRegistry.getSchemas();
    // Make the initial API call
    const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens || 4096,
        messages: formattedMessages,
        tools: tools.length > 0 ? tools : undefined,
    });
    // Get text and tool blocks
    const textBlocks = response.content.filter(block => block.type === 'text');
    const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');
    // If there's initial text, yield it
    if (textBlocks.length > 0) {
        const initialText = textBlocks.map(block => block.text).join('');
        // If there are also tool calls, include them but don't execute yet
        if (toolUseBlocks.length > 0) {
            const pendingToolCalls = toolUseBlocks.map(block => ({
                id: block.id,
                name: block.name,
                input: block.input,
                status: 'pending'
            }));
            yield { type: 'assistant', content: initialText, toolCalls: pendingToolCalls };
        }
        else {
            // No tools, just text
            yield { type: 'assistant', content: initialText };
            yield { type: 'complete' };
            return;
        }
    }
    // If there are tool calls, execute them one by one
    if (toolUseBlocks.length > 0) {
        const executedToolCalls = [];
        for (const toolBlock of toolUseBlocks) {
            const toolCall = {
                id: toolBlock.id,
                name: toolBlock.name,
                input: toolBlock.input,
                status: 'executing'
            };
            // Yield that we're executing this tool
            yield { type: 'tool-executing', toolCall };
            // Execute the tool
            const result = await toolExecutor.execute(toolCall.name, toolCall.input);
            toolCall.result = result;
            toolCall.status = result.success ? 'completed' : 'failed';
            // Yield that the tool is complete
            yield { type: 'tool-complete', toolCall };
            executedToolCalls.push(toolCall);
        }
        // Now we're thinking about the results
        yield { type: 'thinking' };
        // Send tool results back to Claude
        const messagesWithToolResults = [
            ...formattedMessages,
            {
                role: 'assistant',
                content: response.content
            },
            ...executedToolCalls.map(tc => ({
                role: 'user',
                content: [{
                        type: 'tool_result',
                        tool_use_id: tc.id,
                        content: JSON.stringify(tc.result?.output || { error: tc.result?.error || 'No result' })
                    }]
            }))
        ];
        // Get Claude's response after processing tool results
        const finalResponse = await anthropic.messages.create({
            model: config.model,
            max_tokens: config.maxTokens || 4096,
            messages: messagesWithToolResults,
            tools: tools.length > 0 ? tools : undefined,
        });
        // Check if there are more tool calls in the response
        const finalTextBlocks = finalResponse.content.filter(block => block.type === 'text');
        const moreToolBlocks = finalResponse.content.filter(block => block.type === 'tool_use');
        if (finalTextBlocks.length > 0) {
            const finalText = finalTextBlocks.map(block => block.text).join('');
            yield { type: 'assistant', content: finalText };
        }
        // If there are more tools, we could recurse here
        // For now, we'll just complete
        yield { type: 'complete' };
    }
}
//# sourceMappingURL=anthropic.js.map