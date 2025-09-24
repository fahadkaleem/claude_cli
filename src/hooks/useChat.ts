import { useState, useCallback, useRef } from 'react';
import { Message, ChatState } from '../types';
import { chatService } from '../services/anthropic.js';
import type { ToolCall } from '../tools/core/types.js';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: chatService.getMessages(),
    isLoading: false,
    error: null
  });

  // Separate state for queued messages
  const [queuedMessages, setQueuedMessages] = useState<string[]>([]);

  // Message queue for when AI is processing
  const messageQueue = useRef<string[]>([]);
  const isProcessing = useRef(false);

  // Process a single message
  const processMessage = useCallback(async (content: string, additionalMessages: string[] = []) => {
    isProcessing.current = true;

    // Combine all messages with proper indentation
    let combinedMessage = content.trim();
    if (additionalMessages.length > 0) {
      // Add queued messages with 2-space indentation to align with "> "
      const indentedMessages = additionalMessages.map(m => m.trim()).join('\n  ');
      combinedMessage += '\n  ' + indentedMessages;
    }

    // Add combined message to the service
    chatService.addUserMessage(combinedMessage);

    // Clear queued messages once they're sent
    setQueuedMessages([]);
    messageQueue.current = [];

    // Update UI with the new message immediately
    setState(prev => ({
      ...prev,
      messages: chatService.getMessages(),
      isLoading: true,
      error: null
    }));

    try {
      // Process the response stream with the combined message
      for await (const step of chatService.sendMessage(combinedMessage)) {
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
    } finally {
      isProcessing.current = false;
      // Process next message in queue if any with all queued messages
      if (messageQueue.current.length > 0) {
        const allQueued = [...messageQueue.current];
        const nextMessage = allQueued.shift();
        if (nextMessage) {
          messageQueue.current = [];
          setQueuedMessages([]);
          // Process the next message along with all other queued messages
          setTimeout(() => processMessage(nextMessage, allQueued), 0);
        }
      }
    }
  }, []);

  // Public sendMessage function that queues messages
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // If not processing, process immediately with any existing queued messages
    if (!isProcessing.current) {
      const queued = [...messageQueue.current];
      messageQueue.current = [];
      setQueuedMessages([]);
      await processMessage(content, queued);
    } else {
      // Add to queue if already processing
      messageQueue.current.push(content);
      setQueuedMessages(prev => [...prev, content.trim()]);
    }
  }, [processMessage]);

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
    queuedMessages,
    sendMessage,
    clearError,
    clearChat
  };
};