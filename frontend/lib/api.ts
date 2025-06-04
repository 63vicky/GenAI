// API client for communicating with the backend
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface APIResponse {
  success: boolean;
  text?: string;
  timestamp?: string;
  error?: string;
  message?: string;
}

export class ChatAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  }

  /**
   * Send a message to the AI and get a streaming response
   */
  async sendMessageStream(
    prompt: string,
    history: ChatMessage[] = [],
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Call the chunk callback with the new text
          onChunk(chunk);
        }

        // Call completion callback with full text
        onComplete(fullText);
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming API Error:', error);
      onError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Send a message to the AI and get a complete response (fallback)
   */
  async sendMessage(
    prompt: string,
    history: ChatMessage[] = []
  ): Promise<APIResponse> {
    return new Promise((resolve) => {
      let fullText = '';

      this.sendMessageStream(
        prompt,
        history,
        (chunk) => {
          fullText += chunk;
        },
        (complete) => {
          resolve({
            success: true,
            text: complete,
            timestamp: new Date().toISOString(),
          });
        },
        (error) => {
          resolve({
            success: false,
            error,
          });
        }
      );
    });
  }

  /**
   * Convert frontend message format to backend format
   */
  convertToBackendHistory(
    messages: Array<{ content: string; type: 'user' | 'system' }>
  ): ChatMessage[] {
    return messages
      .filter((msg) => msg.content.trim() !== '') // Filter out empty messages
      .map((msg) => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
  }
}

// Export a singleton instance
export const chatAPI = new ChatAPI();
