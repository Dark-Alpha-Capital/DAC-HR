import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "#/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

/**
 * Read-only Markdown renderer. Renders GitHub-flavored markdown with prose
 * typography. Content that was authored as HTML (legacy TipTap fields) is
 * parsed and sanitized so old records keep rendering correctly.
 */
export function Markdown({ children, className }: MarkdownProps) {
  const source = children ?? "";
  if (!source.trim()) {
    return null;
  }

  const containsHtml = HTML_TAG_RE.test(source);

  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={containsHtml ? [rehypeRaw, rehypeSanitize] : undefined}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
