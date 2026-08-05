import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import DeleteScreenerButton from "~/components/delete-screener-button";
import type { Screener } from "@workspace/db/schema";

interface ScreenerContainerProps {
  screeners: Array<
    Screener & { position?: { id: string; name: string } | null }
  >;
}

export default function ScreenerContainer({ screeners }: ScreenerContainerProps) {
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const truncateContent = (content: string, maxLength = 80) => {
    const oneLine = content.replace(/\s+/g, " ").trim();
    if (oneLine.length <= maxLength) return oneLine;
    return `${oneLine.slice(0, maxLength)}...`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Position</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Updated</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Preview</TableHead>
          <TableHead className="text-right py-1.5 px-2 text-xs">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {screeners.map((screener, index) => (
          <TableRow key={screener.id}>
            <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
              {index + 1}
            </TableCell>
            <TableCell className="py-1.5 px-2 font-medium text-sm">
              {screener.name}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-sm">
              {screener.position?.name ?? (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-sm">
              {formatDate(screener.updatedAt)}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-sm text-muted-foreground max-w-md truncate">
              {truncateContent(screener.content)}
            </TableCell>
            <TableCell className="text-right py-1.5 px-2">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0"
                  asChild
                >
                  <Link to="/screeners/$id/edit" params={{ id: screener.id }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <DeleteScreenerButton screenerId={screener.id} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
