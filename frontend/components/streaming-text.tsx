'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  StreamingTextProcessor,
  type StreamingChunk,
} from '@/lib/streaming-processor';
import { cn } from '@/lib/utils';
import type { JSX } from 'react/jsx-runtime';

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  isCompleted: boolean;
  className?: string;
  shouldFadeIn?: boolean;
  onProcessedUpdate?: (processed: StreamingChunk) => void;
}

export function StreamingText({
  content,
  isStreaming,
  isCompleted,
  className,
  shouldFadeIn,
  onProcessedUpdate,
}: StreamingTextProps) {
  const [processedChunk, setProcessedChunk] = useState<StreamingChunk | null>(
    null
  );
  const processorRef = useRef<StreamingTextProcessor>(
    new StreamingTextProcessor()
  );
  const lastContentRef = useRef('');
  const [showCursor, setShowCursor] = useState(false);

  const formattedContent = useMemo(() => {
    if (!content) return null;

    // Split content into lines for processing
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];

    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join('\n');
        elements.push(
          <p
            key={elements.length}
            className={`mb-3 last:mb-0 leading-relaxed  ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            {formatInlineText(paragraphText)}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        elements.push(
          <pre
            key={elements.length}
            className={`bg-muted p-3 rounded-lg overflow-x-auto mb-3 border ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            <code className="text-sm font-mono text-inherit">
              {codeBlockContent.join('\n')}
            </code>
          </pre>
        );
        codeBlockContent = [];
        codeBlockLanguage = '';
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          // Start of code block
          flushParagraph();
          inCodeBlock = true;
          codeBlockLanguage = trimmedLine.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle list items
      if (trimmedLine.startsWith('* ')) {
        flushParagraph();
        const listItemText = trimmedLine.slice(2).trim();
        elements.push(
          <div
            key={elements.length}
            className={`flex items-start gap-2 my-2 ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            <span className="text-current mt-1 flex-shrink-0 font-bold">•</span>
            <span className="flex-1 leading-relaxed">
              {formatInlineText(listItemText)}
            </span>
          </div>
        );
        continue;
      }

      // Handle numbered lists
      const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedListMatch) {
        flushParagraph();
        const [, number, listItemText] = numberedListMatch;
        elements.push(
          <div
            key={elements.length}
            className={`flex items-start gap-2 my-2 ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            <span className="text-current mt-1 flex-shrink-0 font-bold min-w-[1.5rem]">
              {number}.
            </span>
            <span className="flex-1 leading-relaxed">
              {formatInlineText(listItemText)}
            </span>
          </div>
        );
        continue;
      }

      // Handle headings
      if (trimmedLine.startsWith('# ')) {
        flushParagraph();
        elements.push(
          <h1
            key={elements.length}
            className={`text-xl font-bold mb-3 mt-4 first:mt-0 ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            {formatInlineText(trimmedLine.slice(2))}
          </h1>
        );
        continue;
      }

      if (trimmedLine.startsWith('## ')) {
        flushParagraph();
        elements.push(
          <h2
            key={elements.length}
            className={`text-lg font-bold mb-2 mt-3 first:mt-0 ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            {formatInlineText(trimmedLine.slice(3))}
          </h2>
        );
        continue;
      }

      if (trimmedLine.startsWith('### ')) {
        flushParagraph();
        elements.push(
          <h3
            key={elements.length}
            className={`text-base font-bold mb-2 mt-3 first:mt-0 ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            {formatInlineText(trimmedLine.slice(4))}
          </h3>
        );
        continue;
      }

      // Handle blockquotes
      if (trimmedLine.startsWith('> ')) {
        flushParagraph();
        elements.push(
          <blockquote
            key={elements.length}
            className={`border-l-4 border-primary/30 pl-4 mb-3 italic opacity-90 ${
              shouldFadeIn ? 'message-fade-in' : ''
            } `}
          >
            {formatInlineText(trimmedLine.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Handle empty lines
      if (trimmedLine === '') {
        flushParagraph();
        continue;
      }

      // Regular paragraph content
      currentParagraph.push(line);
    }

    // Flush any remaining content
    flushParagraph();
    if (inCodeBlock) {
      flushCodeBlock();
    }

    return elements;
  }, [content]);

  // Format inline text (bold, italic, code)
  function formatInlineText(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    const remaining = text;
    let keyCounter = 0;

    // Process inline code first (highest precedence)
    const codeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(...formatBoldItalic(beforeText, keyCounter));
        keyCounter += beforeText.length;
      }

      // Add the code element
      parts.push(
        <code
          key={`code-${keyCounter++}`}
          className={`bg-muted px-1.5 py-0.5 rounded text-sm font-mono ${
            shouldFadeIn ? 'message-fade-in' : ''
          } `}
        >
          {match[1]}
        </code>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(...formatBoldItalic(remainingText, keyCounter));
    }

    return parts.length > 0 ? parts : [text];
  }

  // Format bold and italic text
  function formatBoldItalic(
    text: string,
    startKey: number
  ): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    const remaining = text;
    let keyCounter = startKey;

    // Process bold text first
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(...formatItalic(beforeText, keyCounter));
        keyCounter += beforeText.length;
      }

      // Add the bold element
      parts.push(
        <strong
          key={`bold-${keyCounter++}`}
          className={`font-semibold ${shouldFadeIn ? 'message-fade-in' : ''} `}
        >
          {match[1]}
        </strong>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(...formatItalic(remainingText, keyCounter));
    }

    return parts.length > 0 ? parts : [text];
  }

  // Format italic text
  function formatItalic(
    text: string,
    startKey: number
  ): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];

    // Process italic text (single asterisk, not preceded or followed by asterisk)
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
    let lastIndex = 0;
    let match;
    let keyCounter = startKey;

    while ((match = italicRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the italic element
      parts.push(
        <em key={`italic-${keyCounter++}`} className="italic">
          {match[1]}
        </em>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  }

  // Reset processor when starting new stream
  useEffect(() => {
    if (isStreaming && content === '') {
      processorRef.current.reset();
      lastContentRef.current = '';
      setShowCursor(true);
    }
  }, [isStreaming]);

  // Process new chunks
  useEffect(() => {
    if (content !== lastContentRef.current) {
      const newChunk = content.slice(lastContentRef.current.length);

      if (newChunk) {
        const processed = processorRef.current.processChunk(newChunk);
        setProcessedChunk(processed);
        onProcessedUpdate?.(processed);
      }

      lastContentRef.current = content;
    }
  }, [content, onProcessedUpdate]);

  // Finalize when streaming completes
  useEffect(() => {
    if (isCompleted && !isStreaming) {
      const final = processorRef.current.finalize();
      setProcessedChunk(final);
      setShowCursor(false);
      onProcessedUpdate?.(final);
    }
  }, [isCompleted, isStreaming, onProcessedUpdate]);

  // Hide cursor when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      const timer = setTimeout(() => setShowCursor(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShowCursor(true);
    }
  }, [isStreaming]);

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <div className={cn('whitespace-pre-wrap leading-relaxed', className)}>
      <div className={`${isStreaming ? 'streaming-glow' : ''}`}>
        {formattedContent}
      </div>
      {(isStreaming || showCursor) && (
        <span className="inline-block w-0.5 h-5 bg-current ml-1 streaming-cursor" />
      )}
    </div>
  );
}
