/**
 * Client-only MDXEditor wrapper.
 *
 * This module statically imports `@mdxeditor/editor` and is only ever loaded
 * on the client (see `markdown-editor.tsx`, which lazy-imports it inside a
 * `ClientOnly` boundary). MDXEditor does not support server-side rendering, so
 * it must never be imported from the SSR graph.
 */
import * as React from "react";
import {
  MDXEditor,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  InsertCodeBlock,
  DiffSourceToggleWrapper,
  Separator,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  codeBlockPlugin,
  tablePlugin,
  diffSourcePlugin,
  toolbarPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./mdx-editor.css";
import { cn } from "#/lib/utils";

interface MarkdownEditorContentProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  error?: boolean;
}

export default function MarkdownEditorContent({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "320px",
  error,
}: MarkdownEditorContentProps) {
  const editorRef = React.useRef<MDXEditorMethods | null>(null);
  const lastEmitted = React.useRef<string | null>(null);

  React.useEffect(() => {
    lastEmitted.current = value;
  }, [value]);

  const handleChange = React.useCallback(
    (md: string) => {
      lastEmitted.current = md;
      onChange(md);
    },
    [onChange],
  );

  // Sync external value changes (e.g. form reset) into the editor without
  // refreshing it on every keystroke (markdown is defaultValue-like).
  React.useEffect(() => {
    if (lastEmitted.current === null) return;
    if (value !== lastEmitted.current && editorRef.current) {
      editorRef.current.setMarkdown(value);
      lastEmitted.current = value;
    }
  }, [value]);

  return (
    <div
      className={cn(
        className,
        error && "rounded-lg ring-2 ring-destructive ring-offset-1",
      )}
      style={{ "--mdx-min-height": minHeight } as React.CSSProperties}
    >
      <MDXEditor
        ref={editorRef}
        className="mdx-editor"
        markdown={value}
        onChange={handleChange}
        placeholder={placeholder}
        contentEditableClassName="mdx-content-editable prose prose-sm dark:prose-invert max-w-none"
        plugins={[
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper>
                <UndoRedo />
                <Separator />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <Separator />
                <BlockTypeSelect />
                <ListsToggle />
                <InsertThematicBreak />
                <Separator />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertCodeBlock />
              </DiffSourceToggleWrapper>
            ),
          }),
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          linkPlugin(),
          linkDialogPlugin(),
          imagePlugin({ imageAutocompleteSuggestions: [] }),
          codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
          tablePlugin(),
          diffSourcePlugin({ viewMode: "rich-text", diffMarkdown: "" }),
        ]}
      />
    </div>
  );
}
