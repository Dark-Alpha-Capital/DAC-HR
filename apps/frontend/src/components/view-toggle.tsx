
import { Button } from "~/components/ui/button";
import { LayoutGrid, Table } from "lucide-react";

type ViewMode = "table" | "kanban";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function ViewToggle({
  viewMode,
  onViewModeChange,
}: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-1 w-fit">
      <Button
        variant={viewMode === "table" ? "default" : "secondary"}
        size="sm"
        onClick={() => onViewModeChange("table")}
        className="gap-2"
      >
        <Table className="h-4 w-4" />
        Table
      </Button>
      <Button
        variant={viewMode === "kanban" ? "default" : "secondary"}
        size="sm"
        onClick={() => onViewModeChange("kanban")}
        className="gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        Kanban
      </Button>
    </div>
  );
}
