import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Link } from "@tanstack/react-router";
import { Badge } from "#/components/ui/badge";

interface Position {
  id: string;
  name: string;
}

interface Round {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  positions: Position[];
}

interface RoundContainerProps {
  rounds: Round[];
}

const RoundContainer = ({ rounds }: RoundContainerProps) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateDescription = (
    description: string | null,
    maxWords: number = 5,
  ) => {
    if (!description) return "-";
    const words = description.split(" ");
    if (words.length <= maxWords) return description;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="py-1.5 px-2 text-xs w-16">#</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Name</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Positions</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Created</TableHead>
          <TableHead className="py-1.5 px-2 text-xs">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rounds.map((round, index) => (
          <TableRow key={round.id} className="relative cursor-pointer">
            <TableCell className="py-1.5 px-2 text-sm text-muted-foreground tabular-nums">
              {index + 1}
            </TableCell>
            <TableCell className="py-1.5 px-2 font-medium text-sm">
              {round.name}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-sm">
              {round.positions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {round.positions.map((position) => (
                    <Badge
                      key={position.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {position.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">No positions</span>
              )}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-sm">
              {formatDate(round.createdAt)}
            </TableCell>
            <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
              {truncateDescription(round.description)}
            </TableCell>
            <Link
              to="/rounds/$id"
              params={{ id: round.id }}
              className="absolute inset-0"
              aria-label={`View ${round.name}`}
            />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default RoundContainer;
