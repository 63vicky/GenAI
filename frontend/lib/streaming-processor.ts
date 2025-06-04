export interface StreamingChunk {
  id: string
  text: string
  isComplete: boolean
  formattedText: string
  rawText: string
}

export interface FormattingState {
  buffer: string
  pendingFormatting: string
  completedText: string
  inCodeBlock: boolean
  inBold: boolean
  inItalic: boolean
  inInlineCode: boolean
}

export class StreamingTextProcessor {
  private state: FormattingState = {
    buffer: "",
    pendingFormatting: "",
    completedText: "",
    inCodeBlock: false,
    inBold: false,
    inItalic: false,
    inInlineCode: false,
  }

  private chunkId = 0

  reset() {
    this.state = {
      buffer: "",
      pendingFormatting: "",
      completedText: "",
      inCodeBlock: false,
      inBold: false,
      inItalic: false,
      inInlineCode: false,
    }
    this.chunkId = 0
  }

  processChunk(newText: string): StreamingChunk {
    this.chunkId++
    this.state.buffer += newText

    // Process the buffer to extract complete formatting
    const processed = this.extractCompleteFormatting(this.state.buffer)

    this.state.completedText += processed.completed
    this.state.buffer = processed.remaining
    this.state.pendingFormatting = processed.pending

    const formattedText = this.formatText(this.state.completedText + this.state.pendingFormatting)

    return {
      id: `chunk-${this.chunkId}`,
      text: newText,
      isComplete: false,
      formattedText,
      rawText: this.state.completedText + this.state.buffer,
    }
  }

  finalize(): StreamingChunk {
    // Process any remaining buffer as complete
    const finalText = this.state.completedText + this.state.buffer
    const formattedText = this.formatText(finalText)

    return {
      id: `chunk-final`,
      text: "",
      isComplete: true,
      formattedText,
      rawText: finalText,
    }
  }

  private extractCompleteFormatting(text: string): {
    completed: string
    remaining: string
    pending: string
  } {
    let completed = ""
    let remaining = text
    let pending = ""

    // Handle code blocks first (they take precedence)
    const codeBlockRegex = /```[\s\S]*?```/g
    let match
    let lastIndex = 0

    while ((match = codeBlockRegex.exec(text)) !== null) {
      completed += text.slice(lastIndex, match.index + match[0].length)
      lastIndex = match.index + match[0].length
    }

    if (lastIndex > 0) {
      remaining = text.slice(lastIndex)
    }

    // Check for incomplete code blocks
    const incompleteCodeBlock = remaining.match(/```[\s\S]*$/g)
    if (incompleteCodeBlock) {
      pending = incompleteCodeBlock[0]
      remaining = remaining.replace(incompleteCodeBlock[0], "")
    }

    // Handle inline formatting (bold, italic, inline code)
    const inlinePatterns = [
      { pattern: /\*\*([^*]+)\*\*/g, incomplete: /\*\*[^*]*$/g }, // Bold
      { pattern: /\*([^*]+)\*/g, incomplete: /\*[^*]*$/g }, // Italic
      { pattern: /`([^`]+)`/g, incomplete: /`[^`]*$/g }, // Inline code
    ]

    for (const { pattern, incomplete } of inlinePatterns) {
      // Extract complete patterns
      let match
      let processedText = remaining
      let lastIndex = 0
      let newCompleted = ""

      while ((match = pattern.exec(remaining)) !== null) {
        newCompleted += remaining.slice(lastIndex, match.index + match[0].length)
        lastIndex = match.index + match[0].length
      }

      if (lastIndex > 0) {
        completed += newCompleted
        processedText = remaining.slice(lastIndex)
      }

      // Check for incomplete patterns
      const incompleteMatch = processedText.match(incomplete)
      if (incompleteMatch && !pending) {
        pending = incompleteMatch[0]
        processedText = processedText.replace(incompleteMatch[0], "")
      }

      remaining = processedText
    }

    return { completed, remaining, pending }
  }

  private formatText(text: string): string {
    // Apply basic markdown formatting
    let formatted = text

    // Code blocks
    formatted = formatted.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-muted p-3 rounded-lg overflow-x-auto mb-3 border"><code class="text-sm font-mono">$1</code></pre>',
    )

    // Inline code
    formatted = formatted.replace(
      /`([^`]+)`/g,
      '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>',
    )

    // Bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')

    // Italic text
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')

    // Line breaks
    formatted = formatted.replace(/\n/g, "<br>")

    // Lists
    formatted = formatted.replace(
      /^\* (.+)$/gm,
      '<div class="flex items-start gap-2 my-1"><span class="text-current mt-1 flex-shrink-0">•</span><span class="flex-1">$1</span></div>',
    )

    return formatted
  }

  getCurrentState(): FormattingState {
    return { ...this.state }
  }
}
