"use client"

import { useState, useEffect, useRef } from "react"
import { MarkdownRenderer } from "./markdown-renderer"
import { cn } from "@/lib/utils"

interface WordStreamingProps {
  text: string
  speed?: number
  startDelay?: number
  onComplete?: () => void
  enabled?: boolean
  className?: string
  isMarkdown?: boolean
}

export function WordStreaming({
  text,
  speed = 100,
  startDelay = 300,
  onComplete,
  enabled = true,
  className,
  isMarkdown = false,
}: WordStreamingProps) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const indexRef = useRef(0)

  // Split text into words while preserving spaces and line breaks
  const words = text.split(/(\s+)/).filter((word) => word.length > 0)

  useEffect(() => {
    if (!enabled) {
      setDisplayedWords(words)
      setIsComplete(true)
      setIsStreaming(false)
      return
    }

    // Reset state
    setDisplayedWords([])
    setIsComplete(false)
    setIsStreaming(false)
    indexRef.current = 0

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (words.length === 0) {
      setIsComplete(true)
      return
    }

    // Start streaming
    timeoutRef.current = setTimeout(() => {
      setIsStreaming(true)
      streamNextWord()
    }, startDelay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, enabled, startDelay])

  const streamNextWord = () => {
    if (indexRef.current < words.length) {
      setDisplayedWords(words.slice(0, indexRef.current + 1))
      indexRef.current++

      // Variable speed based on word content
      let nextSpeed = speed
      const currentWord = words[indexRef.current - 1]

      if (currentWord.includes(".") || currentWord.includes("!") || currentWord.includes("?")) {
        nextSpeed = speed * 2
      } else if (currentWord.includes(",") || currentWord.includes(";")) {
        nextSpeed = speed * 1.5
      } else if (currentWord.trim() === "") {
        nextSpeed = speed * 0.3 // Faster for spaces
      }

      timeoutRef.current = setTimeout(streamNextWord, nextSpeed)
    } else {
      setIsComplete(true)
      setIsStreaming(false)
      onComplete?.()
    }
  }

  const displayedText = displayedWords.join("")

  if (!enabled) {
    return isMarkdown ? (
      <MarkdownRenderer content={text} className={className} />
    ) : (
      <div className={cn("whitespace-pre-wrap leading-relaxed", className)}>{text}</div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {isMarkdown ? (
        <div className="streaming-content">
          <MarkdownRenderer content={displayedText} className="text-inherit" />
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse opacity-70" />}
        </div>
      ) : (
        <div className="whitespace-pre-wrap leading-relaxed streaming-content">
          {displayedText}
          {isStreaming && <span className="inline-block w-0.5 h-4 bg-current ml-1 animate-pulse opacity-70" />}
        </div>
      )}
    </div>
  )
}
