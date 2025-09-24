import { useState, useCallback } from 'react';
import { executeAgentLoop } from '../services/anthropic.js';
export const useChat = () => {
    const [state, setState] = useState({
        messages: [],
        isLoading: false,
        error: null
    });
    const handleSendMessage = useCallback(async (content) => {
        if (!content.trim())
            return;
        const userMessage = {
            role: 'user',
            content: content.trim(),
            timestamp: new Date()
        };
        // Add user message to chat
        let currentMessages = [...state.messages, userMessage];
        setState(prev => ({
            ...prev,
            messages: currentMessages,
            isLoading: true,
            error: null
        }));
        try {
            // Execute the agent loop with async generator
            for await (const step of executeAgentLoop(currentMessages)) {
                switch (step.type) {
                    case 'assistant':
                        // Add assistant message (may include pending tool calls)
                        const assistantMessage = {
                            role: 'assistant',
                            content: step.content,
                            timestamp: new Date(),
                            toolCalls: step.toolCalls
                        };
                        currentMessages = [...currentMessages, assistantMessage];
                        setState(prev => ({
                            ...prev,
                            messages: currentMessages,
                            isLoading: true // Still processing
                        }));
                        break;
                    case 'tool-executing':
                        // Update the tool call status in the last message
                        setState(prev => {
                            const updatedMessages = [...prev.messages];
                            const lastMessage = updatedMessages[updatedMessages.length - 1];
                            if (lastMessage?.toolCalls) {
                                const toolCall = lastMessage.toolCalls.find(tc => tc.id === step.toolCall.id);
                                if (toolCall) {
                                    toolCall.status = 'executing';
                                }
                            }
                            return {
                                ...prev,
                                messages: updatedMessages,
                                isLoading: true
                            };
                        });
                        break;
                    case 'tool-complete':
                        // Update the tool call with result
                        setState(prev => {
                            const updatedMessages = [...prev.messages];
                            const lastMessage = updatedMessages[updatedMessages.length - 1];
                            if (lastMessage?.toolCalls) {
                                const toolCall = lastMessage.toolCalls.find(tc => tc.id === step.toolCall.id);
                                if (toolCall) {
                                    toolCall.status = step.toolCall.status;
                                    toolCall.result = step.toolCall.result;
                                }
                            }
                            return {
                                ...prev,
                                messages: updatedMessages,
                                isLoading: true
                            };
                        });
                        break;
                    case 'thinking':
                        // Just keep the loading state
                        setState(prev => ({
                            ...prev,
                            isLoading: true
                        }));
                        break;
                    case 'complete':
                        // Done!
                        setState(prev => ({
                            ...prev,
                            isLoading: false
                        }));
                        break;
                }
                // Small delay between steps for visual effect
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'An error occurred'
            }));
        }
    }, [state.messages]);
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);
    const clearChat = useCallback(() => {
        setState({
            messages: [],
            isLoading: false,
            error: null
        });
    }, []);
    return {
        messages: state.messages,
        isLoading: state.isLoading,
        error: state.error,
        sendMessage: handleSendMessage,
        clearError,
        clearChat
    };
};
//# sourceMappingURL=useChat.js.map