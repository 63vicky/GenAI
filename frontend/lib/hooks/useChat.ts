'use client';

import { useState, useCallback } from 'react';
import { chatAPI } from '../api';

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'system';
  completed?: boolean;
  newSection?: boolean;
}

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  clearMessages: () => void;
  streamingMessageId: string | null;
  isStreaming: boolean;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    setStreamingMessageId(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading || isStreaming || !content.trim()) return;

      // Clear any previous errors
      setError(null);

      // Add user message
      const shouldAddNewSection = messages.length > 0;
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: content.trim(),
        type: 'user',
        newSection: shouldAddNewSection,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Set loading state
      setIsLoading(true);

      // Add vibration when message is sent
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Convert message history to backend format
      const allMessages = [...messages, userMessage];
      const history = chatAPI.convertToBackendHistory(allMessages);

      try {
        // Create AI message placeholder
        const aiMessageId = `ai-${Date.now()}`;
        const aiMessage: Message = {
          id: aiMessageId,
          content: '',
          type: 'system',
          completed: false,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsLoading(false);
        setIsStreaming(true);
        setStreamingMessageId(aiMessageId);

        // Start streaming
        await chatAPI.sendMessageStream(
          content,
          history,
          // On chunk received
          (chunk: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          },
          // On completion
          (fullText: string) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? { ...msg, content: fullText, completed: true }
                  : msg
              )
            );
            setIsStreaming(false);
            setStreamingMessageId(null);

            // Add vibration when response is complete
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          },
          // On error
          (errorMessage: string) => {
            setError(errorMessage);
            setIsStreaming(false);
            setStreamingMessageId(null);

            // Remove the failed AI message
            setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
          }
        );
      } catch (error) {
        console.error('Error sending message:', error);
        setError(
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
        setIsStreaming(false);
        setStreamingMessageId(null);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isStreaming]
  );

  return {
    messages,
    isLoading,
    isStreaming,
    streamingMessageId,
    error,
    sendMessage,
    clearError,
    clearMessages,
  };
}
