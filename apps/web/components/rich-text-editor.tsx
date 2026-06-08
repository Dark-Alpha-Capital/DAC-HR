/**
 * Rich Text Editor Component
 *
 * A comprehensive rich text editor built with Tiptap that provides all levels of formatting options.
 *
 * Features:
 * - Text formatting: Bold, Italic, Underline, Strikethrough, Inline Code
 * - Headings: H1, H2, H3, Paragraph
 * - Lists: Bullet lists, Ordered lists
 * - Text alignment: Left, Center, Right, Justify
 * - Colors: Text color picker with 18 preset colors
 * - Highlight: Text highlighting with 7 preset colors
 * - Links: Add and edit hyperlinks
 * - Blocks: Blockquotes, Code blocks
 * - History: Undo/Redo
 *
 * @example
 * // Basic usage
 * <RichTextEditor
 *   content={content}
 *   onChange={(html) => setContent(html)}
 *   placeholder="Start typing..."
 * />
 *
 * @example
 * // With form integration (TanStack Form)
 * <form.Field
 *   name="description"
 *   children={(field) => (
 *     <Field>
 *       <FieldLabel>Description</FieldLabel>
 *       <RichTextEditor
 *         content={field.state.value}
 *         onChange={(html) => field.handleChange(html)}
 *         placeholder="Enter description..."
 *       />
 *       {field.state.meta.errors && (
 *         <FieldError errors={field.state.meta.errors} />
 *       )}
 *     </Field>
 *   )}
 * />
 *
 * @example
 * // Read-only mode
 * <RichTextEditor
 *   content={savedContent}
 *   editable={false}
 * />
 */

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@workspace/ui/components/button";
import { Toggle } from "@workspace/ui/components/toggle";
import { Separator } from "@workspace/ui/components/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Code2,
  Highlighter,
  Type,
  Palette,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// Color presets
const TEXT_COLORS = [
  { name: "Default", value: "" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
];

const HIGHLIGHT_COLORS = [
  { name: "None", value: "" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fce7f3" },
  { name: "Purple", value: "#e9d5ff" },
  { name: "Orange", value: "#fed7aa" },
];

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Start typing...",
  editable = true,
  className,
  minHeight = "200px",
  maxHeight = "600px",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "rich-text-editor-content",
          "focus:outline-none",
          "[&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:leading-tight",
          "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:leading-tight",
          "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:leading-tight",
          "[&_p]:leading-relaxed [&_p]:mb-4",
          "[&_ul]:list-disc [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:space-y-2",
          "[&_ol]:list-decimal [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:space-y-2",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground",
          "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
          "[&_a]:text-primary [&_a]:underline [&_a]:cursor-pointer hover:[&_a]:opacity-80",
          "[&_strong]:font-semibold",
          "[&_em]:italic",
          "[&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-900",
          "[&_.is-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-empty:first-child::before]:text-muted-foreground [&_.is-empty:first-child::before]:float-left [&_.is-empty:first-child::before]:pointer-events-none [&_.is-empty:first-child::before]:h-0",
        ),
      },
    },
  });

  const setLink = React.useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-input bg-background shadow-xs",
        className,
      )}
    >
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          {/* Text Formatting */}
          <Toggle
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            size="sm"
            variant="secondary"
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            size="sm"
            variant="secondary"
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("underline")}
            onPressedChange={() =>
              editor.chain().focus().toggleUnderline().run()
            }
            size="sm"
            variant="secondary"
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("strike")}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            size="sm"
            variant="secondary"
            aria-label="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("code")}
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            size="sm"
            variant="secondary"
            aria-label="Inline Code"
          >
            <Code className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          {/* Headings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label="Heading">
                <Type className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                className={cn(
                  editor.isActive("heading", { level: 1 }) && "bg-accent",
                )}
              >
                <Heading1 className="mr-2 h-4 w-4" />
                Heading 1
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className={cn(
                  editor.isActive("heading", { level: 2 }) && "bg-accent",
                )}
              >
                <Heading2 className="mr-2 h-4 w-4" />
                Heading 2
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                className={cn(
                  editor.isActive("heading", { level: 3 }) && "bg-accent",
                )}
              >
                <Heading3 className="mr-2 h-4 w-4" />
                Heading 3
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={cn(editor.isActive("paragraph") && "bg-accent")}
              >
                Paragraph
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <Toggle
            pressed={editor.isActive("bulletList")}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            size="sm"
            variant="secondary"
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("orderedList")}
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            size="sm"
            variant="secondary"
            aria-label="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("blockquote")}
            onPressedChange={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            size="sm"
            variant="secondary"
            aria-label="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("codeBlock")}
            onPressedChange={() =>
              editor.chain().focus().toggleCodeBlock().run()
            }
            size="sm"
            variant="secondary"
            aria-label="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Alignment */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label="Text Alignment">
                <AlignLeft className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().setTextAlign("left").run()
                }
                className={cn(
                  editor.isActive({ textAlign: "left" }) && "bg-accent",
                )}
              >
                <AlignLeft className="mr-2 h-4 w-4" />
                Left
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
                className={cn(
                  editor.isActive({ textAlign: "center" }) && "bg-accent",
                )}
              >
                <AlignCenter className="mr-2 h-4 w-4" />
                Center
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().setTextAlign("right").run()
                }
                className={cn(
                  editor.isActive({ textAlign: "right" }) && "bg-accent",
                )}
              >
                <AlignRight className="mr-2 h-4 w-4" />
                Right
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  editor.chain().focus().setTextAlign("justify").run()
                }
                className={cn(
                  editor.isActive({ textAlign: "justify" }) && "bg-accent",
                )}
              >
                <AlignJustify className="mr-2 h-4 w-4" />
                Justify
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Color */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" aria-label="Text Color">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="grid grid-cols-4 gap-2 p-2">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      if (color.value) {
                        editor.chain().focus().setColor(color.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                    }}
                    className={cn(
                      "h-8 w-8 rounded-md border-2 border-border hover:scale-110 transition-transform",
                      color.value === "" && "bg-background",
                      editor.getAttributes("textStyle").color === color.value &&
                        "ring-2 ring-primary ring-offset-2",
                    )}
                    style={
                      color.value
                        ? {
                            backgroundColor: color.value,
                          }
                        : {
                            background:
                              "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                            backgroundSize: "8px 8px",
                            backgroundPosition:
                              "0 0, 0 4px, 4px -4px, -4px 0px",
                          }
                    }
                    title={color.name}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Highlight Color */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Highlight Color"
              >
                <Highlighter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <div className="grid grid-cols-4 gap-2 p-2">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      if (color.value) {
                        editor
                          .chain()
                          .focus()
                          .toggleHighlight({ color: color.value })
                          .run();
                      } else {
                        editor.chain().focus().unsetHighlight().run();
                      }
                    }}
                    className={cn(
                      "h-8 w-8 rounded-md border-2 border-border hover:scale-110 transition-transform",
                      color.value === "" && "bg-background",
                      editor.getAttributes("highlight").color === color.value &&
                        "ring-2 ring-primary ring-offset-2",
                    )}
                    style={
                      color.value
                        ? {
                            backgroundColor: color.value,
                          }
                        : {
                            background:
                              "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                            backgroundSize: "8px 8px",
                            backgroundPosition:
                              "0 0, 0 4px, 4px -4px, -4px 0px",
                          }
                    }
                    title={color.name}
                  />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6" />

          {/* Link */}
          <Toggle
            pressed={editor.isActive("link")}
            onPressedChange={setLink}
            size="sm"
            variant="secondary"
            aria-label="Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          {/* History */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Editor Content */}
      <div
        className={cn(
          "overflow-y-auto p-4 rounded-b-lg transition-all",
          editable && "min-h-[200px] cursor-text",
        )}
        style={{
          minHeight: editable ? minHeight : undefined,
          maxHeight: editable ? maxHeight : undefined,
        }}
        onClick={() => {
          if (editable && editor) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// Export a controlled component wrapper for easier form integration
interface RichTextEditorFieldProps extends RichTextEditorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  error?: boolean;
  id?: string;
}

export function RichTextEditorField({
  value = "",
  onValueChange,
  error,
  className,
  ...props
}: RichTextEditorFieldProps) {
  return (
    <div className={cn(error && "rounded-lg ring-2 ring-destructive")}>
      <RichTextEditor
        content={value}
        onChange={onValueChange}
        className={className}
        {...props}
      />
    </div>
  );
}
