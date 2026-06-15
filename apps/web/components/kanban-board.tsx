import * as React from "react";
import { cn } from "@/lib/utils";

export interface KanbanColumn<TItem> {
  id: string;
  title: string;
  count?: number;
  items: TItem[];
}

interface KanbanBoardProps<TItem> {
  columns: KanbanColumn<TItem>[];
  renderItem: (item: TItem) => React.ReactNode;
  /**
   * Wrapper classes. This is the scrollable container – by default it will
   * scroll when content overflows.
   */
  className?: string;
  columnClassName?: string;
}

function KanbanBoardInner<TItem>({
  columns,
  renderItem,
  className,
  columnClassName,
}: KanbanBoardProps<TItem>) {
  if (!columns || !Array.isArray(columns)) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div
      className={cn(
        // Allow horizontal scrolling on small screens while fitting naturally
        // inside whatever vertical layout it's placed in.
        "relative w-full overflow-x-auto overflow-y-visible",
        // Allows the board to live inside a sidebar layout without
        // affecting the page-level scroll.
        className,
      )}
    >
      <div
        className={cn(
          // On small screens, stack columns vertically and make them full-width.
          // From `sm` and up, use the classic horizontal kanban layout.
          "flex flex-col sm:flex-row sm:gap-3 min-w-full sm:min-w-max p-2 pb-4",
        )}
      >
        {columns.map((column) => (
          <div
            key={column.id}
            className={cn(
              // Mobile: take most of the viewport width, full-width stack.
              // Desktop: fixed column width with horizontal scrolling when needed.
              "shrink-0 w-full sm:w-64 sm:max-w-xs lg:w-72 flex flex-col",
              columnClassName,
            )}
          >
            <div className="mb-2 px-1 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-xs text-muted-foreground">
                {column.title}
              </h3>
              {typeof column.count === "number" && (
                <span className="text-[0.65rem] text-muted-foreground">
                  {column.count}
                </span>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              {column.items.map(renderItem)}
            </div>
          </div>
        ))}
        <div
          className="hidden sm:block shrink-0 w-4 sm:w-8 md:w-12"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default KanbanBoardInner;
