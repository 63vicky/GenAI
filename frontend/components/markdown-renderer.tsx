import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  isStreaming,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraph styling
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed text-inherit">
              {children}
            </p>
          ),

          // Strong/Bold text
          strong: ({ children }) => (
            <strong className="font-semibold text-inherit">{children}</strong>
          ),

          // Emphasis/Italic text
          em: ({ children }) => (
            <em className="italic text-inherit">{children}</em>
          ),

          // Unordered lists
          ul: ({ children }) => (
            <ul className="mb-3 last:mb-0 space-y-1 pl-4 list-disc">
              {children}
            </ul>
          ),

          // Ordered lists
          ol: ({ children }) => (
            <ol className="mb-3 last:mb-0 space-y-1 pl-4 list-decimal">
              {children}
            </ol>
          ),

          // List items
          li: ({ children }) => (
            <li className="text-inherit leading-relaxed">{children}</li>
          ),

          // Code blocks
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-inherit">
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3 border">
                <code className="text-sm font-mono text-inherit">
                  {children}
                </code>
              </pre>
            );
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/30 pl-4 mb-3 italic text-inherit opacity-90">
              {children}
            </blockquote>
          ),

          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 text-inherit">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mb-2 text-inherit">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold mb-2 text-inherit">
              {children}
            </h3>
          ),

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),

          // Horizontal rules
          hr: () => <hr className="border-border my-4" />,

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
