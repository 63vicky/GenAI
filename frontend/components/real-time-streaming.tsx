"use client"

import { useState, useEffect, useRef } from "react"
import { MarkdownRenderer } from "./markdown-renderer"
import { cn } from "@/lib/utils"

interface StreamingChunk {
  id: string
  text: string
  timestamp: number
}

interface RealTimeStreamingProps {
  chunks: StreamingChunk[]
  isComplete?: boolean
  className?: string
  onComplete?: () => void
  speed?: number
}

export function RealTimeStreaming({
  chunks,
  isComplete = false,
  className,
  onComplete,
  speed = 30,
}: RealTimeStreamingProps) {
  const [displayedChunks, setDisplayedChunks] = useState<StreamingChunk[]>([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [currentChunkText, setCurrentChunkText] = useState("")
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const charIndexRef = useRef(0)

  const fullText = chunks.map((chunk) => chunk.text).join("")

  useEffect(() => {
    if (chunks.length === 0) return

    const streamNextChar = () => {
      if (currentChunkIndex < chunks.length) {
        const currentChunk = chunks[currentChunkIndex]
        const chunkText = currentChunk.text

        if (charIndexRef.current < chunkText.length) {
          // Add next character
          setCurrentChunkText(chunkText.slice(0, charIndexRef.current + 1))
          charIndexRef.current++

          // Variable speed based on character
          let nextSpeed = speed
          const currentChar = chunkText[charIndexRef.current - 1]

          if (currentChar === "." || currentChar === "!" || currentChar === "?") {
            nextSpeed = speed * 3
          } else if (currentChar === "," || currentChar === ";") {
            nextSpeed = speed * 2
          } else if (currentChar === " ") {
            nextSpeed = speed * 0.5
          }

          timeoutRef.current = setTimeout(streamNextChar, nextSpeed)
        } else {
          // Move to next chunk
          setDisplayedChunks((prev) => [...prev, { ...currentChunk, text: currentChunkText }])
          setCurrentChunkIndex((prev) => prev + 1)
          setCurrentChunkText("")
          charIndexRef.current = 0

          if (currentChunkIndex + 1 < chunks.length) {
            timeoutRef.current = setTimeout(streamNextChar, speed)
          } else if (isComplete) {
            onComplete?.()
          }
        }
      }
    }

    streamNextChar()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [chunks, currentChunkIndex, currentChunkText, isComplete, speed, onComplete])

  const combinedText = displayedChunks.map((chunk) => chunk.text).join("") + currentChunkText

  return (
    <div className={cn("relative", className)}>
      <div className="streaming-markdown">
        <MarkdownRenderer content={combinedText} className="text-inherit" />
        {!isComplete && currentChunkIndex < chunks.length && (
          <span className="inline-block w-0.5 h-5 bg-current ml-1 animate-pulse opacity-60" />
        )}
      </div>
    </div>
  )
}
