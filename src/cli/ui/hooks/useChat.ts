import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, ChatState } from '../types.js';
import { ChatClient } from '../../../core/ChatClient.js';
import { EventType, ContentBlock } from '../../../core/types.js';
import type { Config } from '../../../config/Config.js';
import { usePermission } from '../contexts/PermissionContext.js';

export const useChat = (client: ChatClient, config: Config) => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: undefined
  });

  const [queuedMessages, setQueuedMessages] = useState<string[]>([]);
  const messageQueue = useRef<Array<{content: string, display?: string}>>([]);
  const isProcessing = useRef(false);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // Pending text accumulator (for streaming text)
  const pendingTextRef = useRef<string>('');

  const { requestPermission, requestConfirmation } = usePermission();

  useEffect(() => {
    // Wire up permission system
    if (config) {
      const toolExecutor = config.getToolExecutor();
      toolExecutor.onPermissionRequired = requestPermission;
      toolExecutor.onConfirmationRequired = requestConfirmation;
    }

    // Load initial history if client is available
    if (client && client.isInitialized()) {
      setState(prev => ({
        ...prev,
        messages: client.getHistory()
      }));
    }
  }, [client, config, requestPermission, requestConfirmation]);

  const processMessage = useCallback(async (
    content: string,
    displayContent: string | undefined,
    additionalMessages: Array<{content: string, display?: string}> = []
  ) => {
    if (!client || !client.isInitialized()) {
      setState(prev => ({
        ...prev,
        error: 'Client not initialized'
      }));
      return;
    }

    isProcessing.current = true;
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let combinedMessage = content.trim();
    if (additionalMessages.length > 0) {
      const indentedMessages = additionalMessages.map(m => m.content.trim()).join('\n  ');
      combinedMessage += '\n  ' + indentedMessages;
    }

    setQueuedMessages([]);
    messageQueue.current = [];

    // Show user message immediately
    const userMsg: Message = {
      role: 'user',
      content: combinedMessage,
      timestamp: new Date()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: undefined
    }));

    try {
      // Reset pending text
      pendingTextRef.current = '';

      for await (const event of client.sendMessageStream(combinedMessage, signal)) {
        switch (event.type) {
          case EventType.Content:
            // Accumulate text
            pendingTextRef.current += event.content;

            // Update UI: history + user message + pending text
            setState(prev => {
              const history = client.getHistory();
              const pendingMsg: Message = {
                role: 'assistant',
                content: pendingTextRef.current,
                timestamp: new Date()
              };
              return {
                ...prev,
                messages: [...history, pendingMsg],
                isLoading: true
              };
            });
            break;

          case EventType.ToolExecuting:
          case EventType.ToolComplete:
            // Clear pending text when tools start
            pendingTextRef.current = '';

            // Show updated history
            setState(prev => ({
              ...prev,
              messages: client.getHistory(),
              isLoading: true
            }));
            break;

          case EventType.Thinking:
            break;

          case EventType.Complete:
            pendingTextRef.current = '';
            setState(prev => ({
              ...prev,
              messages: client.getHistory(),
              isLoading: false
            }));
            break;

          case EventType.Error:
            pendingTextRef.current = '';
            setState(prev => ({
              ...prev,
              messages: client.getHistory(),
              isLoading: false,
              error: event.error.message
            }));
            break;
        }
      }
    } catch (error) {
      const isAborted = error instanceof Error &&
        (error.message === 'AbortError' || error.name === 'AbortError');

      pendingTextRef.current = '';

      if (isAborted) {
        setState(prev => ({
          ...prev,
          messages: client.getHistory(),
          isLoading: false,
          error: undefined
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
    }
  }, [client]);

  const sendMessage = useCallback((content: string, displayContent?: string) => {
    if (isProcessing.current) {
      messageQueue.current.push({ content, display: displayContent });
      setQueuedMessages(prev => [...prev, content]);
      return;
    }
    processMessage(content, displayContent, []);
  }, [processMessage]);

  const abortResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = undefined;
    }
    pendingTextRef.current = '';
    setState(prev => ({
      ...prev,
      isLoading: false
    }));
  }, []);

  const clearChat = useCallback(() => {
    client?.clearHistory();
    pendingTextRef.current = '';
    setState({
      messages: [],
      isLoading: false,
      error: undefined
    });
    setQueuedMessages([]);
    messageQueue.current = [];
  }, [client]);

  const addMessageToHistory = useCallback((content: string, role: 'user' | 'assistant' = 'user') => {
    // Not used
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    queuedMessages,
    sendMessage,
    abortResponse,
    abortOperation: abortResponse,
    clearChat,
    clearError,
    addMessageToHistory,
    isConnected: true,
    client
  };
};