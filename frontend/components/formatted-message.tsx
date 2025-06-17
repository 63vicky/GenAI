'use client';

import type React from 'react';
import { cn } from '@/lib/utils';
// import type { JSX } from 'react/jsx-runtime';

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

function stripHtml(html: string): string {
  if (typeof window !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  } else {
    // SSR fallback
    return html.replace(/<[^>]+>/g, '');
  }
}

export function FormattedMessage({
  content,
  isStreaming = false,
  streamingWords = [],
  className,
}: FormattedMessageProps) {
  // Handle streaming content with synchronized cursor
  if (isStreaming && streamingWords.length > 0) {
    return (
      <div className={cn('prose prose-sm max-w-none', className)}>
        <p className="text-foreground leading-relaxed mb-3 last:mb-0">
          <span className="inline-flex flex-wrap items-baseline">
            {streamingWords.map((word) => (
              <span key={word.id} className="streaming-word">
                {stripHtml(word.text)}
              </span>
            ))}
            <span className="typing-cursor" />
          </span>
        </p>
      </div>
    );
  }

  // Handle completed content with formatting
  // const formattedContent = formatText(content);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
      className={cn('prose prose-sm max-w-none', className)}
    />
  );
}
