'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy,
  RefreshCcw,
  Share2,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Download,
  Edit3,
  MessageCircle,
  Sparkles,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Code,
  FileText,
  Mail,
  Twitter,
  Link,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InteractiveButtonsProps {
  messageId: string;
  content: string;
  onRetry?: () => void;
  onEdit?: () => void;
  onContinue?: (action: string) => void;
  className?: string;
  handleTextarea: () => void;
}

export function InteractiveButtons({
  messageId,
  content,
  onRetry,
  onEdit,
  onContinue,
  className,
  handleTextarea,
}: InteractiveButtonsProps) {
  const [liked, setLiked] = useState<boolean | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [shared, setShared] = useState(false);

  // Copy to clipboard functionality
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Text-to-speech functionality
  const handleReadAloud = () => {
    if (isReading) {
      speechSynthesis.cancel();
      setIsReading(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  // Share functionality
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Response',
          text: content,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying share link
      handleCopy();
    }
  };

  // Download as text file
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-response-${messageId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate code from response
  const handleGenerateCode = () => {
    // This could trigger a new AI request to convert the response to code
    if (onContinue) {
      onContinue('code');
    }
  };

  // Create summary
  const handleSummarize = () => {
    // This could trigger a new AI request to summarize the response
    if (onContinue) {
      onContinue('summary');
    }
  };

  // Expand on topic
  const handleExpand = () => {
    // This could trigger a new AI request to expand on the topic
    if (onContinue) {
      onContinue('expand');
    }
  };

  const primaryButtons = [
    {
      icon: copied ? Check : Copy,
      label: copied ? 'Copied!' : 'Copy',
      onClick: handleCopy,
      variant: 'ghost' as const,
      className: copied ? 'text-green-600' : '',
    },
    {
      icon: RefreshCcw,
      label: 'Retry',
      onClick: onRetry,
      variant: 'ghost' as const,
    },
    {
      icon: shared ? Check : Share2,
      label: shared ? 'Shared!' : 'Share',
      onClick: handleShare,
      variant: 'ghost' as const,
      className: shared ? 'text-green-600' : '',
    },
    {
      icon: isReading ? VolumeX : Volume2,
      label: isReading ? 'Stop' : 'Read',
      onClick: handleReadAloud,
      variant: 'ghost' as const,
      className: isReading ? 'text-primary' : '',
    },
  ];

  const actionButtons = [
    {
      icon: Sparkles,
      label: 'Improve',
      onClick: () => {
        onEdit?.();
        handleTextarea?.();
      },
      variant: 'outline' as const,
      className: 'border-purple-200 text-purple-700 hover:bg-purple-50',
    },
    {
      icon: MessageCircle,
      label: 'Continue',
      onClick: () => {
        handleExpand();
        handleTextarea?.();
      },
      variant: 'outline' as const,
      className: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    },
    {
      icon: Code,
      label: 'Code',
      onClick: () => {
        handleGenerateCode?.();
        handleTextarea?.();
      },
      variant: 'outline' as const,
      className: 'border-green-200 text-green-700 hover:bg-green-50',
    },
    {
      icon: FileText,
      label: 'Summary',
      onClick: () => {
        handleSummarize?.();
        handleTextarea?.();
      },
      variant: 'outline' as const,
      className: 'border-orange-200 text-orange-700 hover:bg-orange-50',
    },
  ];

  const secondaryButtons = [
    {
      icon: Bookmark,
      label: bookmarked ? 'Saved' : 'Save',
      onClick: () => setBookmarked(!bookmarked),
      variant: 'ghost' as const,
      className: bookmarked ? 'text-yellow-600' : '',
    },
    {
      icon: Download,
      label: 'Download',
      onClick: handleDownload,
      variant: 'ghost' as const,
    },
    {
      icon: Edit3,
      label: 'Edit',
      onClick: () => {
        onEdit?.();
        handleTextarea?.();
      },
      variant: 'ghost' as const,
    },
  ];

  return (
    <div className={cn('flex flex-col gap-3 mt-3 mb-4', className)}>
      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {primaryButtons.map((button, index) => (
          <Button
            key={index}
            variant={button.variant}
            size="sm"
            onClick={button.onClick}
            className={cn(
              'h-8 px-3 text-xs font-medium transition-all duration-200 hover:scale-105',
              button.className
            )}
            disabled={!button.onClick}
          >
            <button.icon className="h-3 w-3 mr-1.5" />
            {button.label}
          </Button>
        ))}

        {/* Feedback Buttons */}
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLiked(liked === true ? null : true)}
            className={cn(
              'h-8 w-8 p-0 transition-all duration-200 hover:scale-110',
              liked === true ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLiked(liked === false ? null : false)}
            className={cn(
              'h-8 w-8 p-0 transition-all duration-200 hover:scale-110',
              liked === false ? 'text-red-600' : 'text-muted-foreground'
            )}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {actionButtons.map((button, index) => (
          <Button
            key={index}
            variant={button.variant}
            size="sm"
            onClick={button.onClick}
            className={cn(
              'h-8 px-3 text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-sm',
              button.className
            )}
          >
            <button.icon className="h-3 w-3 mr-1.5" />
            {button.label}
          </Button>
        ))}

        {/* More Options Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMore(!showMore)}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </div>

      {/* Secondary Buttons (Expandable) */}
      {showMore && (
        <div className="flex items-center gap-2 flex-wrap animate-fade-in">
          {secondaryButtons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant}
              size="sm"
              onClick={button.onClick}
              className={cn(
                'h-8 px-3 text-xs font-medium transition-all duration-200 hover:scale-105',
                button.className
              )}
            >
              <button.icon className="h-3 w-3 mr-1.5" />
              {button.label}
            </Button>
          ))}

          {/* Quick Share Options */}
          <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    content.slice(0, 200) + '...'
                  )}`
                )
              }
              className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50"
            >
              <Twitter className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  `mailto:?subject=AI_Response&body=${encodeURIComponent(
                    content
                  )}`
                )
              }
              className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-50"
            >
              <Mail className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-50"
            >
              <Link className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Feedback */}
      {liked !== null && (
        <div className="text-xs text-muted-foreground animate-fade-in">
          {liked
            ? '✨ Thanks for the positive feedback!'
            : "📝 We'll use this to improve our responses."}
        </div>
      )}
    </div>
  );
}
