import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Badge } from "#/components/ui/badge";
import {
  hireLevelLabels,
  statusBadgeClass,
  statusLabels,
} from "#/features/positions/position-metadata";

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
                    className={`text-xs ${statusBadgeClass(position.status)}`}
                  >
                    {statusLabels[
                      position.status as keyof typeof statusLabels
                    ] || position.status}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-1.5 px-2 text-sm">
                {position.hireLevel ? (
                  <Badge variant="secondary" className="text-xs">
                    {hireLevelLabels[
                      position.hireLevel as keyof typeof hireLevelLabels
                    ] || position.hireLevel}
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
