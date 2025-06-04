'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  Search,
  Plus,
  Lightbulb,
  ArrowUp,
  Menu,
  PenSquare,
  Moon,
  Sun,
  MessageSquare,
  Trash2,
  X,
  Brain,
  Palette,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormattedMessage } from '@/components/formatted-message';
import { InteractiveButtons } from '@/components/interactive-buttons';
import { cn } from '@/lib/utils';

type ActiveButton = 'none' | 'add' | 'deepSearch' | 'think';
type MessageType = 'user' | 'system';

interface Message {
  id: string;
  content: string;
  type: MessageType;
  completed?: boolean;
  newSection?: boolean;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface MessageSection {
  id: string;
  messages: Message[];
  isNewSection: boolean;
  isActive?: boolean;
  sectionIndex: number;
}

interface StreamingWord {
  id: number;
  text: string;
}

interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

// Google Generative AI API format interfaces
interface APIPart {
  text: string;
}

interface APIMessage {
  role: 'user' | 'model';
  parts: APIPart[];
}

// Faster word delay for smoother streaming
const WORD_DELAY = 40; // ms per word
const CHUNK_SIZE = 2; // Number of words to add at once

// Suggestion cards data
const suggestionCards: SuggestionCard[] = [
  {
    id: '1',
    title: 'Explain a concept',
    description: 'Learn about quantum computing',
    icon: <Brain className="h-5 w-5" />,
    prompt: 'Explain quantum computing in simple terms with examples',
  },
  {
    id: '2',
    title: 'Creative writing',
    description: 'Generate a space story',
    icon: <Palette className="h-5 w-5" />,
    prompt: 'Write a short science fiction story about space exploration',
  },
  {
    id: '3',
    title: 'Get assistance',
    description: 'Plan healthy meals',
    icon: <Heart className="h-5 w-5" />,
    prompt: 'Help me plan a week of healthy meals for a busy schedule',
  },
  {
    id: '4',
    title: 'Stay updated',
    description: 'Learn about web dev trends',
    icon: <TrendingUp className="h-5 w-5" />,
    prompt: 'What are the latest trends in web development for 2024?',
  },
];

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const newSectionRef = useRef<HTMLDivElement>(null);
  const [hasTyped, setHasTyped] = useState(false);
  const [activeButton, setActiveButton] = useState<ActiveButton>('none');
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageSections, setMessageSections] = useState<MessageSection[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingWords, setStreamingWords] = useState<StreamingWord[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [viewportHeight, setViewportHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(
    new Set()
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const shouldFocusAfterStreamingRef = useRef(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const selectionStateRef = useRef<{
    start: number | null;
    end: number | null;
  }>({ start: null, end: null });

  // Chat history and theme states
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Constants for layout calculations
  const HEADER_HEIGHT = 48;
  const INPUT_AREA_HEIGHT = 100;
  const TOP_PADDING = 48;
  const BOTTOM_PADDING = 128;
  const ADDITIONAL_OFFSET = 16;

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if device is mobile and get viewport height
  useEffect(() => {
    const checkMobileAndViewport = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);

      const vh = window.innerHeight;
      setViewportHeight(vh);

      if (isMobileDevice && mainContainerRef.current) {
        mainContainerRef.current.style.height = `${vh}px`;
      }
    };

    checkMobileAndViewport();

    if (mainContainerRef.current) {
      mainContainerRef.current.style.height = isMobile
        ? `${viewportHeight}px`
        : '100svh';
    }

    window.addEventListener('resize', checkMobileAndViewport);
    return () => window.removeEventListener('resize', checkMobileAndViewport);
  }, [isMobile, viewportHeight]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && !(event.target as Element).closest('.menu-sidebar')) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load chat histories on mount
  useEffect(() => {
    loadChatHistories();
  }, []);

  // Organize messages into sections
  useEffect(() => {
    if (messages.length === 0) {
      setMessageSections([]);
      setActiveSectionId(null);
      return;
    }

    const sections: MessageSection[] = [];
    let currentSection: MessageSection = {
      id: `section-${Date.now()}-0`,
      messages: [],
      isNewSection: false,
      sectionIndex: 0,
    };

    messages.forEach((message) => {
      if (message.newSection) {
        if (currentSection.messages.length > 0) {
          sections.push({
            ...currentSection,
            isActive: false,
          });
        }

        const newSectionId = `section-${Date.now()}-${sections.length}`;
        currentSection = {
          id: newSectionId,
          messages: [message],
          isNewSection: true,
          isActive: true,
          sectionIndex: sections.length,
        };

        setActiveSectionId(newSectionId);
      } else {
        currentSection.messages.push(message);
      }
    });

    if (currentSection.messages.length > 0) {
      sections.push(currentSection);
    }

    setMessageSections(sections);
  }, [messages]);

  // Auto-scroll effects
  useEffect(() => {
    if (messageSections.length > 1) {
      setTimeout(() => {
        const scrollContainer = chatContainerRef.current;
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [messageSections]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, streamingWords]);

  // Focus management
  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isStreaming && shouldFocusAfterStreamingRef.current && !isMobile) {
      focusTextarea();
      shouldFocusAfterStreamingRef.current = false;
    }
  }, [isStreaming, isMobile]);

  // API and database functions
  const loadChatHistories = async () => {
    try {
      const response = await fetch('http://localhost:8080/chats');
      if (response.ok) {
        const histories = await response.json();
        setChatHistories(histories);
      }
    } catch (error) {
      console.error('Error loading chat histories:', error);
    }
  };

  const saveChatHistory = async (chatId: string, messages: Message[]) => {
    try {
      const title =
        messages.find((m) => m.type === 'user')?.content.slice(0, 50) + '...' ||
        'New Chat';

      const chatData = {
        id: chatId,
        title,
        messages,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch('http://localhost:8080/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatData),
      });

      if (response.ok) {
        loadChatHistories();
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const deleteChatHistory = async (chatId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChatHistories((prev) => prev.filter((chat) => chat.id !== chatId));
        if (currentChatId === chatId) {
          startNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat history:', error);
    }
  };

  const loadChatHistory = (chatHistory: ChatHistory) => {
    setCurrentChatId(chatHistory.id);
    setMessages(chatHistory.messages);
    setIsMenuOpen(false);
  };

  const startNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    setCurrentChatId(newChatId);
    setMessages([]);
    setCompletedMessages(new Set());
    setIsMenuOpen(false);
  };

  // Convert internal messages to Google Generative AI format
  const convertToAPIFormat = (messages: Message[]): APIMessage[] => {
    return messages
      .filter((msg) => msg.content.trim() !== '') // Filter out empty messages
      .map((msg) => ({
        role: msg.type === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
  };

  const generateResponseFromAPI = async (
    userMessage: string,
    history: Message[]
  ): Promise<string> => {
    try {
      // Convert messages to the Google Generative AI format with 'parts' structure
      const apiHistory = convertToAPIFormat(history);

      const payload = {
        prompt: userMessage,
        history: apiHistory,
      };

      const response = await fetch('http://localhost:8080/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const data = await response.json();

      return data.response || data.message || data.text || String(data);
    } catch (error) {
      console.error('Error calling API:', error);
      return "I apologize, but I'm having trouble connecting to the server right now. Please try again later.";
    }
  };

  // Utility functions
  const getContentHeight = () => {
    return viewportHeight - TOP_PADDING - BOTTOM_PADDING - ADDITIONAL_OFFSET;
  };

  const saveSelectionState = () => {
    if (textareaRef.current) {
      selectionStateRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  const restoreSelectionState = () => {
    const textarea = textareaRef.current;
    const { start, end } = selectionStateRef.current;

    if (textarea && start !== null && end !== null) {
      textarea.focus();
      textarea.setSelectionRange(start, end);
    } else if (textarea) {
      textarea.focus();
    }
  };

  const focusTextarea = () => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  };

  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target === e.currentTarget ||
      (e.currentTarget === inputContainerRef.current &&
        !(e.target as HTMLElement).closest('button'))
    ) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
    setHasTyped(true);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(
        24,
        Math.min(textareaRef.current.scrollHeight, 160)
      );
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleTextAreaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
    }
  };

  const simulateTextStreaming = async (text: string) => {
    const words = text.split(' ');
    let currentIndex = 0;
    setStreamingWords([]);
    setIsStreaming(true);

    return new Promise<void>((resolve) => {
      const streamInterval = setInterval(() => {
        if (currentIndex < words.length) {
          const nextIndex = Math.min(currentIndex + CHUNK_SIZE, words.length);
          const newWords = words.slice(currentIndex, nextIndex);

          setStreamingWords((prev) => [
            ...prev,
            {
              id: Date.now() + currentIndex,
              text: newWords.join(' ') + ' ',
            },
          ]);

          currentIndex = nextIndex;
        } else {
          clearInterval(streamInterval);
          resolve();
        }
      }, WORD_DELAY);
    });
  };

  const simulateAIResponse = async (userMessage: string) => {
    const messageId = Date.now().toString();
    setStreamingMessageId(messageId);

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        content: '',
        type: 'system',
      },
    ]);

    setTimeout(() => {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 200);

    try {
      const response = await generateResponseFromAPI(userMessage, messages);
      await simulateTextStreaming(response);

      const updatedMessages = messages.concat([
        {
          id: `user-${Date.now() - 1}`,
          content: userMessage,
          type: 'user' as MessageType,
        },
        {
          id: messageId,
          content: response,
          type: 'system' as MessageType,
          completed: true,
        },
      ]);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: response, completed: true }
            : msg
        )
      );

      setCompletedMessages((prev) => new Set(prev).add(messageId));

      // Save to database
      if (currentChatId) {
        await saveChatHistory(currentChatId, updatedMessages);
      }

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error in simulateAIResponse:', error);
      const errorMessage =
        'I apologize, but I encountered an error while processing your request. Please try again.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, content: errorMessage, completed: true }
            : msg
        )
      );

      setCompletedMessages((prev) => new Set(prev).add(messageId));
    } finally {
      setStreamingWords([]);
      setStreamingMessageId(null);
      setIsStreaming(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    if (!isStreaming) {
      setInputValue(newValue);

      if (newValue.trim() !== '' && !hasTyped) {
        setHasTyped(true);
      } else if (newValue.trim() === '' && hasTyped) {
        setHasTyped(false);
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const newHeight = Math.max(24, Math.min(textarea.scrollHeight, 160));
        textarea.style.height = `${newHeight}px`;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      const userMessage = inputValue.trim();

      // Create new chat if none exists
      if (!currentChatId) {
        const newChatId = `chat-${Date.now()}`;
        setCurrentChatId(newChatId);
      }

      const shouldAddNewSection = messages.length > 0;

      const newUserMessage = {
        id: `user-${Date.now()}`,
        content: userMessage,
        type: 'user' as MessageType,
        newSection: shouldAddNewSection,
      };

      setInputValue('');
      setHasTyped(false);
      setActiveButton('none');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      setMessages((prev) => [...prev, newUserMessage]);

      if (!isMobile) {
        focusTextarea();
      } else {
        if (textareaRef.current) {
          textareaRef.current.blur();
        }
      }

      simulateAIResponse(userMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isStreaming && e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    if (!isStreaming && !isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleButton = (button: ActiveButton) => {
    if (!isStreaming) {
      saveSelectionState();
      setActiveButton((prev) => (prev === button ? 'none' : button));
      setTimeout(() => {
        restoreSelectionState();
      }, 0);
    }
  };

  // Interactive button handlers
  const handleRetryMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message && message.type === 'system') {
      // Find the user message that triggered this response
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.type === 'user') {
        simulateAIResponse(userMessage.content);
      }
    }
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      // Suppose 'htmlString' contains your AI-generated HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = message.content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      setInputValue(plainText);
      setHasTyped(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleContinueConversation = (messageId: string, action: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      // Suppose 'htmlString' contains your AI-generated HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = message.content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      let prompt = '';
      switch (action) {
        case 'expand':
          prompt = `Please expand on this topic: "${plainText.slice(
            0,
            100
          )}..."`;
          break;
        case 'code':
          prompt = `Convert this to code: "${plainText.slice(0, 100)}..."`;
          break;
        case 'summary':
          prompt = `Provide a summary of: "${plainText.slice(0, 100)}..."`;
          break;
        default:
          prompt = `Continue this conversation about: "${plainText.slice(
            0,
            100
          )}..."`;
      }
      setInputValue(prompt);
      setHasTyped(true);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const renderMessage = (message: Message) => {
    const isCompleted = completedMessages.has(message.id);
    const isStreamingMessage = message.id === streamingMessageId;

    // Suppose 'htmlString' contains your AI-generated HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = message.content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    return (
      <div
        key={message.id}
        className={cn(
          'flex flex-col',
          message.type === 'user' ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'max-w-[85%] px-4 py-3 rounded-2xl break-words',
            message.type === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-none'
              : 'bg-muted/50 border border-border'
          )}
        >
          {message.type === 'user' ? (
            <span className="text-primary-foreground">{message.content}</span>
          ) : (
            <>
              {/* For completed system messages, render with formatting */}
              {message.content && !isStreamingMessage && (
                <FormattedMessage
                  content={message.content}
                  isStreaming={false}
                  className={
                    message.type === 'system' && !isCompleted
                      ? 'animate-fade-in'
                      : ''
                  }
                />
              )}

              {/* For streaming messages, render with animation and cursor */}
              {isStreamingMessage && (
                <FormattedMessage
                  content=""
                  isStreaming={true}
                  streamingWords={streamingWords}
                />
              )}
            </>
          )}
        </div>

        {/* Interactive Buttons for AI responses */}
        {message.type === 'system' && message.completed && (
          <InteractiveButtons
            handleTextarea={() => handleTextAreaHeight()}
            messageId={message.id}
            content={plainText}
            onRetry={() => handleRetryMessage(message.id)}
            onEdit={() => handleEditMessage(message.id)}
            onContinue={(action) =>
              handleContinueConversation(message.id, action)
            }
            className="ml-4"
          />
        )}
      </div>
    );
  };

  const renderWelcomeScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Welcome to GenAI Chat
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start a conversation with AI. Ask questions, get help, or just chat!
          </p>
          <p className="text-sm text-muted-foreground">
            Experience real-time streaming responses with interactive features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {suggestionCards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleSuggestionClick(card.prompt)}
              className="group p-6 rounded-xl border border-border bg-card hover:bg-accent transition-all duration-200 text-left"
            >
              <div className="flex items-start space-x-3">
                <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground group-hover:text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const shouldApplyHeight = (sectionIndex: number) => {
    return sectionIndex > 0;
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      ref={mainContainerRef}
      className="bg-background flex flex-col overflow-hidden relative"
      style={{ height: isMobile ? `${viewportHeight}px` : '100svh' }}
    >
      {/* Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Menu Sidebar */}
      <div
        className={cn(
          'menu-sidebar fixed top-0 left-0 h-full w-80 bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out',
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Chat History
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <Button
              onClick={startNewChat}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Theme</span>
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? 'dark' : 'light')
                  }
                />
                <Moon className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recent Chats
              </h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {chatHistories.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => loadChatHistory(chat)}
                      className="flex-1 text-left p-2 rounded-md hover:bg-accent text-sm truncate"
                    >
                      <div className="flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{chat.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteChatHistory(chat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <header className="fixed top-0 left-0 right-0 h-12 flex items-center px-4 z-20 bg-background border-b border-border">
        <div className="w-full flex items-center justify-between px-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
            <span className="sr-only">Menu</span>
          </Button>

          <h1 className="text-base font-medium text-foreground">GenAI Chat</h1>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-foreground" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={startNewChat}
            >
              <PenSquare className="h-5 w-5 text-foreground" />
              <span className="sr-only">New Chat</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {messages.length === 0 ? (
        renderWelcomeScreen()
      ) : (
        <div
          ref={chatContainerRef}
          className="flex-grow pb-32 pt-12 px-4 overflow-y-auto scroll-smooth"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="max-w-4xl mx-auto space-y-6">
            {messageSections.map((section, sectionIndex) => (
              <div
                key={section.id}
                ref={
                  sectionIndex === messageSections.length - 1 &&
                  section.isNewSection
                    ? newSectionRef
                    : null
                }
              >
                {section.isNewSection && (
                  <div
                    style={
                      section.isActive &&
                      shouldApplyHeight(section.sectionIndex)
                        ? { height: `${getContentHeight()}px` }
                        : {}
                    }
                    className="pt-4 flex flex-col justify-start space-y-6"
                  >
                    {section.messages.map((message) => renderMessage(message))}
                  </div>
                )}

                {!section.isNewSection && (
                  <div className="space-y-6">
                    {section.messages.map((message) => renderMessage(message))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div
            ref={inputContainerRef}
            className={cn(
              'relative w-full rounded-3xl border border-border bg-background p-3 cursor-text',
              isStreaming && 'opacity-80'
            )}
            onClick={handleInputContainerClick}
          >
            <div className="pb-9">
              <Textarea
                ref={textareaRef}
                placeholder={
                  isStreaming
                    ? 'Waiting for response...'
                    : 'Ask anything... (⌘K to focus, ⌘↵ to send)'
                }
                className="min-h-[24px] max-h-[160px] w-full rounded-3xl border-0 !bg-transparent text-foreground placeholder:text-muted-foreground placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-2 pr-4 pt-0 pb-0 resize-none overflow-y-auto leading-tight"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (textareaRef.current) {
                    textareaRef.current.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }
                }}
              />
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      'rounded-full h-8 w-8 flex-shrink-0 border-border p-0 transition-colors',
                      activeButton === 'add' && 'bg-accent border-border'
                    )}
                    onClick={() => toggleButton('add')}
                    disabled={isStreaming}
                  >
                    <Plus
                      className={cn(
                        'h-4 w-4 text-muted-foreground',
                        activeButton === 'add' && 'text-foreground'
                      )}
                    />
                    <span className="sr-only">Add</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'rounded-full h-8 px-3 flex items-center border-border gap-1.5 transition-colors',
                      activeButton === 'deepSearch' && 'bg-accent border-border'
                    )}
                    onClick={() => toggleButton('deepSearch')}
                    disabled={isStreaming}
                  >
                    <Search
                      className={cn(
                        'h-4 w-4 text-muted-foreground',
                        activeButton === 'deepSearch' && 'text-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm text-muted-foreground',
                        activeButton === 'deepSearch' && 'text-foreground'
                      )}
                    >
                      DeepSearch
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'rounded-full h-8 px-3 flex items-center border-border gap-1.5 transition-colors',
                      activeButton === 'think' && 'bg-accent border-border'
                    )}
                    onClick={() => toggleButton('think')}
                    disabled={isStreaming}
                  >
                    <Lightbulb
                      className={cn(
                        'h-4 w-4 text-muted-foreground',
                        activeButton === 'think' && 'text-foreground'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm text-muted-foreground',
                        activeButton === 'think' && 'text-foreground'
                      )}
                    >
                      Think
                    </span>
                  </Button>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  size="icon"
                  className={cn(
                    'rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200',
                    hasTyped ? '!bg-primary scale-110' : 'bg-muted'
                  )}
                  disabled={!inputValue.trim() || isStreaming}
                >
                  <ArrowUp
                    className={cn(
                      'h-4 w-4 transition-colors',
                      hasTyped
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span className="sr-only">Submit</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
