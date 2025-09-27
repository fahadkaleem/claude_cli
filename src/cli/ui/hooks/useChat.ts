import { useState, useCallback, useRef } from 'react';
import { Message, ChatState } from '../types';
import { chatService } from '../../../services/anthropic.js';
import type { ToolCall } from '../../../tools/core/types.js';
import { InterruptedIndicator } from '../constants.js';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: chatService.getMessages(),
    isLoading: false,
    error: null
  });

  // Separate state for queued messages
  const [queuedMessages, setQueuedMessages] = useState<string[]>([]);

  // Message queue for when AI is processing
  const messageQueue = useRef<Array<{content: string, display?: string}>>([]);
  const isProcessing = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add message to history without invoking Claude
  const addMessageToHistory = useCallback((content: string, role: 'user' | 'assistant' = 'user') => {
    if (role === 'user') {
      chatService.addUserMessage(content, content);
    } else {
      chatService.addAssistantMessage(content, content);
    }
    // Force state update with a new array reference
    setState(prev => ({
      ...prev,
      messages: [...chatService.getMessages()]
    }));
  }, []);

  // Process a single message
  const processMessage = useCallback(async (
    content: string,
    displayContent: string | undefined,
    additionalMessages: Array<{content: string, display?: string}> = []
  ) => {
    isProcessing.current = true;

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Track if this turn was cancelled
    let wasCancelled = false;

    // Combine all messages with proper indentation
    let combinedMessage = content.trim();
    let combinedDisplay = displayContent?.trim() || content.trim();

    if (additionalMessages.length > 0) {
      // Add queued messages with 2-space indentation to align with "> "
      const indentedMessages = additionalMessages.map(m => m.content.trim()).join('\n  ');
      const indentedDisplays = additionalMessages.map(m => (m.display || m.content).trim()).join('\n  ');
      combinedMessage += '\n  ' + indentedMessages;
      combinedDisplay += '\n  ' + indentedDisplays;
    }

    // Add combined message to the service (content for API, displayContent for UI)
    chatService.addUserMessage(combinedMessage, combinedDisplay);

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
      for await (const step of chatService.sendMessage(combinedMessage, signal)) {
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
      // Check if it was an abort error
      const isAborted = error instanceof Error && (error.message === 'AbortError' || error.name === 'AbortError');
      wasCancelled = isAborted;

      if (isAborted) {
        // Just clear the loading state - interrupted message already added in abortOperation
        setState(prev => ({
          ...prev,
          messages: chatService.getMessages(),
          isLoading: false,
          error: null
        }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred'
        }));
      }
    } finally {
      isProcessing.current = false;
      abortControllerRef.current = null;
      // Process next message in queue if any with all queued messages
      if (messageQueue.current.length > 0) {
        const allQueued = [...messageQueue.current];
        const nextMessage = allQueued.shift();
        if (nextMessage) {
          messageQueue.current = [];
          setQueuedMessages([]);
          // Process the next message along with all other queued messages
          setTimeout(() => processMessage(nextMessage.content, nextMessage.display, allQueued), 0);
        }
      }
    }
  }, []);

  // Public sendMessage function that queues messages
  const sendMessage = useCallback(async (content: string, displayContent?: string) => {
    if (!content.trim()) return;

    // If not processing, process immediately with any existing queued messages
    if (!isProcessing.current) {
      const queued = [...messageQueue.current];
      messageQueue.current = [];
      setQueuedMessages([]);
      await processMessage(content, displayContent, queued);
    } else {
      // Add to queue if already processing
      const queueItem = {content, display: displayContent};
      messageQueue.current.push(queueItem);
      setQueuedMessages(prev => [...prev, (displayContent || content).trim()]);
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

  const abortOperation = useCallback(() => {
    // If there's an active abort controller, abort it
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Immediately append interrupted message to the last message
    const messages = chatService.getMessages();
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only add if not already interrupted
      if (!lastMessage.content.includes(InterruptedIndicator)) {
        lastMessage.content = lastMessage.content + '\n  ' + InterruptedIndicator;
      }
    }

    // Clear the loading state and update messages
    setState(prev => ({
      ...prev,
      messages: chatService.getMessages(),
      isLoading: false
    }));

    // Clear processing flag and queued messages
    isProcessing.current = false;
    setQueuedMessages([]);
    messageQueue.current = [];
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    queuedMessages,
    sendMessage,
    addMessageToHistory,
    clearError,
    clearChat,
    abortOperation
  };
};