import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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
            <TableHead className="w-16 px-2 py-1.5 text-xs">#</TableHead>
            <TableHead className="px-2 py-1.5 text-xs">Name</TableHead>
            <TableHead className="px-2 py-1.5 text-xs">Status</TableHead>
            <TableHead className="px-2 py-1.5 text-xs">Hire Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((position, index) => (
            <TableRow key={position.id} className="relative cursor-pointer">
              <TableCell className="py-1.5 px-2 text-sm text-muted-foreground tabular-nums">
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
              <Link
                to="/positions/$slug"
                params={{ slug: position.slug }}
                className="absolute inset-0"
                aria-label={`View ${position.name}`}
              />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
