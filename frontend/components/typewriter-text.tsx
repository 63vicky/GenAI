"use client"

import { useTypewriter } from "@/lib/hooks/useTypewriter"
import { MarkdownRenderer } from "./markdown-renderer"
import { cn } from "@/lib/utils"

interface TypewriterTextProps {
  text: string
  speed?: number
  startDelay?: number
  onComplete?: () => void
  enabled?: boolean
  className?: string
  isMarkdown?: boolean
}

export function TypewriterText({
  text,
  speed = 30,
  startDelay = 100,
  onComplete,
  enabled = true,
  className,
  isMarkdown = false,
}: TypewriterTextProps) {
  const { displayedText, isComplete, isStarted } = useTypewriter({
    text,
    speed,
    startDelay,
    onComplete,
    enabled,
  })

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
        <MarkdownRenderer content={displayedText} className="text-inherit" />
      ) : (
        <div className="whitespace-pre-wrap leading-relaxed">{displayedText}</div>
      )}

      {/* Animated cursor */}
      {isStarted && !isComplete && <span className="inline-block w-0.5 h-5 bg-current ml-0.5 animate-pulse" />}
    </div>
  )
}
