"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChat = void 0;
const react_1 = require("react");
const anthropic_1 = require("../services/anthropic");
const useChat = () => {
    const [state, setState] = (0, react_1.useState)({
        messages: [
            {
                role: 'system',
                content: 'Welcome to Claude CLI Chat! Type your message and press Ctrl+Enter to send.',
                timestamp: new Date()
            }
        ],
        isLoading: false,
        error: null
    });
    const [currentStreamMessage, setCurrentStreamMessage] = (0, react_1.useState)('');
    const sendMessage = (0, react_1.useCallback)(async (content) => {
        if (!content.trim())
            return;
        const userMessage = {
            role: 'user',
            content: content.trim(),
            timestamp: new Date()
        };
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            isLoading: true,
            error: null
        }));
        setCurrentStreamMessage('');
        try {
            let fullResponse = '';
            await (0, anthropic_1.streamMessage)([...state.messages, userMessage], (chunk) => {
                fullResponse += chunk;
                setCurrentStreamMessage(fullResponse);
            });
            const assistantMessage = {
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date()
            };
            setState(prev => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
                isLoading: false
            }));
            setCurrentStreamMessage('');
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'An error occurred'
            }));
            setCurrentStreamMessage('');
        }
    }, [state.messages]);
    const clearError = (0, react_1.useCallback)(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);
    const clearChat = (0, react_1.useCallback)(() => {
        setState({
            messages: [
                {
                    role: 'system',
                    content: 'Chat cleared. Type your message and press Ctrl+Enter to send.',
                    timestamp: new Date()
                }
            ],
            isLoading: false,
            error: null
        });
        setCurrentStreamMessage('');
    }, []);
    return {
        messages: state.messages,
        isLoading: state.isLoading,
        error: state.error,
        currentStreamMessage,
        sendMessage,
        clearError,
        clearChat
    };
};
exports.useChat = useChat;
//# sourceMappingURL=useChat.js.map