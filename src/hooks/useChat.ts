import { useState, useCallback } from 'react';
import { Message, ChatState } from '../types';
import { streamMessage } from '../services/anthropic';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null
  });

  const [currentStreamMessage, setCurrentStreamMessage] = useState<string>('');

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
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

      await streamMessage(
        [...state.messages, userMessage],
        (chunk) => {
          fullResponse += chunk;
          setCurrentStreamMessage(fullResponse);
        }
      );

      const assistantMessage: Message = {
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
      setCurrentStreamMessage('');
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