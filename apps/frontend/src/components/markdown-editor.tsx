import * as React from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

type MarkdownComponent = React.ComponentType<{ children: string }>;

function MarkdownPreview({ value }: { value: string }) {
  const [Markdown, setMarkdown] = React.useState<MarkdownComponent | null>(
    null,
  );

  React.useEffect(() => {
    let cancelled = false;
    void import("react-markdown").then((mod) => {
      if (!cancelled) {
        setMarkdown(() => mod.default);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!value.trim()) {
    return <p className="text-muted-foreground italic">Nothing to preview</p>;
  }

  if (!Markdown) {
    return <p className="text-muted-foreground text-sm">Loading preview...</p>;
  }

  return <Markdown>{value}</Markdown>;
}

function MarkdownEditorInner({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "320px",
}: MarkdownEditorProps) {
  return (
    <div
      className={cn(
        "grid gap-4 md:grid-cols-2 border rounded-lg overflow-hidden",
        className,
      )}
    >
      <div className="flex flex-col border-r">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/40">
          Markdown
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[320px] resize-none rounded-none border-0 focus-visible:ring-0 font-mono text-sm"
          style={{ minHeight }}
        />
      </div>
      <div className="flex flex-col">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/40">
          Preview
        </div>
        <div
          className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-y-auto text-sm"
          style={{ minHeight }}
        >
          <MarkdownPreview value={value} />
        </div>
      </div>
    </div>
  );
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  return (
    <ClientOnly
      fallback={
        <Skeleton
          className="w-full rounded-lg"
          style={{ minHeight: props.minHeight ?? "320px" }}
        />
      }
    >
      <MarkdownEditorInner {...props} />
    </ClientOnly>
  );
}
