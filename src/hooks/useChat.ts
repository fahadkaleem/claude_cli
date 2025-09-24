import { useState, useCallback } from 'react';
import { Message, ChatState } from '../types';
import { chatService } from '../services/anthropic.js';
import type { ToolCall } from '../tools/core/types.js';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: chatService.getMessages(),
    isLoading: false,
    error: null
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Set loading state
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      // Process message through the chat service
      for await (const step of chatService.sendMessage(content.trim())) {
        switch (step.type) {
          case 'assistant': {
            // Update messages from service (it manages the history now)
            setState(prev => ({
              ...prev,
              messages: chatService.getMessages(),
              isLoading: true // Still processing if there are tools
            }));
            break;
          }

          case 'tool-executing': {
            // Update the tool status in the UI
            setState(prev => {
              const messages = chatService.getMessages();
              const lastMessage = messages[messages.length - 1];

              if (lastMessage?.toolCalls) {
                const toolCall = lastMessage.toolCalls.find(
                  tc => tc.id === step.toolCall.id
                );
                if (toolCall) {
                  toolCall.status = step.toolCall.status;
                }
              }

              return {
                ...prev,
                messages: [...messages], // Force re-render
                isLoading: true
              };
            });
            break;
          }

          case 'tool-complete': {
            // Update tool with result
            setState(prev => {
              const messages = chatService.getMessages();
              const lastMessage = messages[messages.length - 1];

              if (lastMessage?.toolCalls) {
                const toolCall = lastMessage.toolCalls.find(
                  tc => tc.id === step.toolCall.id
                );
                if (toolCall) {
                  Object.assign(toolCall, step.toolCall);
                }
              }

              return {
                ...prev,
                messages: [...messages], // Force re-render
                isLoading: true
              };
            });
            break;
          }

          case 'thinking': {
            // Just keep loading state
            break;
          }

          case 'complete': {
            // Final state update
            setState(prev => ({
              ...prev,
              messages: chatService.getMessages(),
              isLoading: false
            }));
            break;
          }
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearChat = useCallback(() => {
    chatService.clearMessages();
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
    sendMessage,
    clearError,
    clearChat
  };
};