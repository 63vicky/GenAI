"use client"

import { useState, useEffect, useRef } from "react"

interface UseTypewriterOptions {
  text: string
  speed?: number
  startDelay?: number
  onComplete?: () => void
  enabled?: boolean
}

export function useTypewriter({
  text,
  speed = 30,
  startDelay = 100,
  onComplete,
  enabled = true,
}: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text)
      setIsComplete(true)
      setIsStarted(true)
      return
    }

    // Reset state when text changes
    setDisplayedText("")
    setIsComplete(false)
    setIsStarted(false)
    indexRef.current = 0

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!text) {
      setIsComplete(true)
      return
    }

    // Start the typewriter effect after initial delay
    timeoutRef.current = setTimeout(() => {
      setIsStarted(true)
      typeNextCharacter()
    }, startDelay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, enabled, startDelay])

  const typeNextCharacter = () => {
    if (indexRef.current < text.length) {
      setDisplayedText((prev) => prev + text[indexRef.current])
      indexRef.current++

      // Variable speed based on character type
      let nextSpeed = speed
      const currentChar = text[indexRef.current - 1]

      // Slower for punctuation to create natural pauses
      if (currentChar === "." || currentChar === "!" || currentChar === "?") {
        nextSpeed = speed * 3
      } else if (currentChar === "," || currentChar === ";" || currentChar === ":") {
        nextSpeed = speed * 2
      } else if (currentChar === "\n") {
        nextSpeed = speed * 1.5
      }

      timeoutRef.current = setTimeout(typeNextCharacter, nextSpeed)
    } else {
      setIsComplete(true)
      onComplete?.()
    }
  }

  return {
    displayedText,
    isComplete,
    isStarted,
  }
}
