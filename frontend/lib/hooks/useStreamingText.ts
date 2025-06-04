'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseStreamingTextOptions {
  text: string;
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
  enabled?: boolean;
}

export function useStreamingText({
  text,
  speed = 30,
  startDelay = 500,
  onComplete,
  enabled = true,
}: UseStreamingTextOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  const streamText = useCallback(() => {
    if (indexRef.current < text.length) {
      const nextChar = text[indexRef.current];
      setDisplayedText(text.slice(0, indexRef.current + 1));
      indexRef.current++;

      // Variable speed based on character type
      let nextSpeed = speed;
      if (nextChar === '.' || nextChar === '!' || nextChar === '?') {
        nextSpeed = speed * 4; // Longer pause after sentences
      } else if (nextChar === ',' || nextChar === ';' || nextChar === ':') {
        nextSpeed = speed * 2; // Medium pause after clauses
      } else if (nextChar === ' ') {
        nextSpeed = speed * 0.8; // Slightly faster for spaces
      } else if (nextChar === '\n') {
        nextSpeed = speed * 3; // Pause for line breaks
      }

      timeoutRef.current = setTimeout(streamText, nextSpeed);
    } else {
      setIsComplete(true);
      setIsStreaming(false);
      onComplete?.();
    }
  }, [text, speed, onComplete]);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      setIsStreaming(false);
      return;
    }

    // Reset state when text changes
    setDisplayedText('');
    setIsComplete(false);
    setIsStreaming(false);
    indexRef.current = 0;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!text) {
      setIsComplete(true);
      return;
    }

    // Start streaming after delay
    timeoutRef.current = setTimeout(() => {
      setIsStreaming(true);
      streamText();
    }, startDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, enabled, startDelay, streamText]);

  return {
    displayedText,
    isComplete,
    isStreaming,
  };
}
