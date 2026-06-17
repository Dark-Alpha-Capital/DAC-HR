import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import DeletePositionButton from "~/components/delete-position-button";
import { Badge } from "~/components/ui/badge";

const hireLevelLabels: Record<string, string> = {
  "managing-director": "Managing Director",
  "vice-president": "Vice President",
  associate: "Associate",
  analyst: "Analyst",
  intern: "Intern",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  hold: "Hold",
  passed: "Passed",
  upcoming: "Upcoming",
};

function getStatusColorClass(status: string | null | undefined): string {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    case "hold":
      return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    case "passed":
      return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
    case "upcoming":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  }
}

interface Position {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hireLevel?: string | null;
  status?: string | null;
}

export default function PositionContainer({
  positions,
}: {
  positions: Position[];
}) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Status</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Hire Level</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Slug</TableHead>
            <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
            <TableHead className="text-right py-1.5 px-2 text-xs">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((position, index) => (
            <TableRow key={position.id}>
              <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="py-1.5 px-2 font-medium text-sm">
                {position.name}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {position.status ? (
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getStatusColorClass(position.status)}`}
                  >
                    {statusLabels[position.status] || position.status}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {position.hireLevel ? (
                  <Badge variant="secondary" className="text-xs">
                    {hireLevelLabels[position.hireLevel] || position.hireLevel}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {position.slug}
                </code>
              </TableCell>
              <TableCell className="py-1.5 px-2 text-xs text-muted-foreground">
                —
              </TableCell>
              <TableCell className="text-right py-1.5 px-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <Link
                      to="/positions/$slug"
                      params={{ slug: position.slug }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 p-0"
                    asChild
                  >
                    <Link
                      to="/positions/$slug/edit"
                      params={{ slug: position.slug }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <DeletePositionButton positionId={position.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
