import * as React from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "~/components/ui/skeleton";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  error?: boolean;
}

type MarkdownEditorContentComponent = React.ComponentType<MarkdownEditorProps>;

function MarkdownEditorClient(props: MarkdownEditorProps) {
  const [Content, setContent] =
    React.useState<MarkdownEditorContentComponent | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void import("./mdx-editor-content").then((mod) => {
      if (!cancelled) {
        setContent(() => mod.default);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Content) {
    return (
      <Skeleton
        className="w-full rounded-lg"
        style={{ minHeight: props.minHeight ?? "320px" }}
      />
    );
  }

  return <Content {...props} />;
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
      <MarkdownEditorClient {...props} />
    </ClientOnly>
  );
}
