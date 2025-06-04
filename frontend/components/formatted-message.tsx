'use client';

import type React from 'react';
import { cn } from '@/lib/utils';
import type { JSX } from 'react/jsx-runtime';

interface StreamingWord {
  id: number;
  text: string;
}

interface FormattedMessageProps {
  content: string;
  isStreaming?: boolean;
  streamingWords?: StreamingWord[];
  className?: string;
}

export function FormattedMessage({
  content,
  isStreaming = false,
  streamingWords = [],
  className,
}: FormattedMessageProps) {
  // Function to format text with basic markdown-like styling
  const formatText = (text: string) => {
    if (!text) return [];

    // Split by double newlines for paragraphs
    const paragraphs = text.split(/\n\s*\n/);

    return paragraphs
      .map((paragraph, pIndex) => {
        if (!paragraph.trim()) return null;

        // Check if it's a list (starts with numbers, bullets, or dashes)
        const listItems = paragraph.split('\n').filter((line) => line.trim());
        const isNumberedList = listItems.every((item) =>
          /^\d+\./.test(item.trim())
        );
        const isBulletList = listItems.every((item) =>
          /^[-•*]/.test(item.trim())
        );

        if ((isNumberedList || isBulletList) && listItems.length > 1) {
          const ListTag = isNumberedList ? 'ol' : 'ul';
          return (
            <ListTag
              key={pIndex}
              className={cn(
                'my-3 space-y-1',
                isNumberedList
                  ? 'list-decimal list-inside'
                  : 'list-disc list-inside'
              )}
            >
              {listItems.map((item, iIndex) => {
                const cleanItem = item.replace(/^(\d+\.|-|•|\*)/, '').trim();
                return (
                  <li key={iIndex} className="text-foreground leading-relaxed">
                    {formatInlineText(cleanItem)}
                  </li>
                );
              })}
            </ListTag>
          );
        }

        // Check if it's a heading (starts with #)
        if (paragraph.trim().startsWith('#')) {
          const headingLevel = paragraph.match(/^#+/)?.[0].length || 1;
          const headingText = paragraph.replace(/^#+\s*/, '');
          const HeadingTag = `h${Math.min(
            headingLevel,
            6
          )}` as keyof JSX.IntrinsicElements;

          return (
            <HeadingTag
              key={pIndex}
              className={cn(
                'font-semibold text-foreground mt-4 mb-2',
                headingLevel === 1 && 'text-xl',
                headingLevel === 2 && 'text-lg',
                headingLevel >= 3 && 'text-base'
              )}
            >
              {formatInlineText(headingText)}
            </HeadingTag>
          );
        }

        // Check if it's a code block (wrapped in \`\`\`)
        if (
          paragraph.trim().startsWith('```') &&
          paragraph.trim().endsWith('```')
        ) {
          const codeContent = paragraph
            .replace(/^```[\w]*\n?/, '')
            .replace(/\n?```$/, '');
          return (
            <pre
              key={pIndex}
              className="bg-muted rounded-lg p-4 my-3 overflow-x-auto"
            >
              <code className="text-sm font-mono text-foreground">
                {codeContent}
              </code>
            </pre>
          );
        }

        // Regular paragraph
        return (
          <p
            key={pIndex}
            className="text-foreground leading-relaxed mb-3 last:mb-0"
          >
            {formatInlineText(paragraph)}
          </p>
        );
      })
      .filter(Boolean);
  };

  // Function to format inline text (bold, italic, code, links)
  const formatInlineText = (text: string) => {
    const parts = [];
    let currentIndex = 0;

    // Patterns for inline formatting
    const patterns = [
      {
        regex: /\*\*(.*?)\*\*/g,
        component: (match: string, content: string, key: number) => (
          <strong key={key} className="font-semibold">
            {content}
          </strong>
        ),
      },
      {
        regex: /\*(.*?)\*/g,
        component: (match: string, content: string, key: number) => (
          <em key={key} className="italic">
            {content}
          </em>
        ),
      },
      {
        regex: /`(.*?)`/g,
        component: (match: string, content: string, key: number) => (
          <code
            key={key}
            className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
          >
            {content}
          </code>
        ),
      },
      {
        regex: /\[([^\]]+)\]$$([^)]+)$$/g,
        component: (
          match: string,
          linkText: string,
          url: string,
          key: number
        ) => (
          <a
            key={key}
            href={url}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>
        ),
      },
    ];

    // Find all matches
    const allMatches: Array<{
      start: number;
      end: number;
      element: React.ReactNode;
    }> = [];

    patterns.forEach((pattern) => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          element: pattern.component(
            match[0],
            match[1],
            match[2] || allMatches.length,
            allMatches.length
          ),
        });
      }
    });

    // Sort matches by start position
    allMatches.sort((a, b) => a.start - b.start);

    // Build the result
    let partIndex = 0;
    allMatches.forEach((match) => {
      // Add text before the match
      if (currentIndex < match.start) {
        const textBefore = text.slice(currentIndex, match.start);
        if (textBefore) {
          parts.push(<span key={`text-${partIndex++}`}>{textBefore}</span>);
        }
      }

      // Add the formatted element
      parts.push(match.element);
      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      if (remainingText) {
        parts.push(<span key={`text-${partIndex++}`}>{remainingText}</span>);
      }
    }

    return parts.length > 0 ? parts : text;
  };

  // Handle streaming content with synchronized cursor
  if (isStreaming && streamingWords.length > 0) {
    return (
      <div className={cn('prose prose-sm max-w-none', className)}>
        <p className="text-foreground leading-relaxed mb-3 last:mb-0">
          <span className="inline-flex flex-wrap items-baseline">
            {streamingWords.map((word) => (
              <span key={word.id} className="streaming-word">
                {word.text}
              </span>
            ))}
            <span
              className="typing-cursor"
              style={{
                animationDelay: `${streamingWords.length * 30}ms`,
              }}
            />
          </span>
        </p>
      </div>
    );
  }

  // Handle completed content with formatting
  const formattedContent = formatText(content);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
      className={cn('prose prose-sm max-w-none', className)}
    />
  );
}
