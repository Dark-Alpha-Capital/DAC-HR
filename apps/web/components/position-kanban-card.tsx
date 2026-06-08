import { Link } from "@tanstack/react-router";
import { Eye, Pencil } from "lucide-react";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";

import DeletePositionButton from "@/components/delete-position-button";

const statusLabels: Record<string, string> = {
  active: "Active",
  hold: "Hold",
  passed: "Passed",
  upcoming: "Upcoming",
};

const getStatusColorClass = (status: string | null | undefined): string => {
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
};

export interface PositionKanbanCardProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status?: string | null;
}

const PositionKanbanCard = ({
  id,
  name,
  slug,
  description,
  status,
}: PositionKanbanCardProps) => {
  return (
    <Card key={id} className="hover:shadow-sm transition-shadow py-2 px-2">
      <CardContent className="p-2">
        <div className="space-y-1.5">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="font-medium leading-tight text-sm">{name}</h4>
              {status && (
                <Badge
                  variant="secondary"
                  className={`text-[0.65rem] ${getStatusColorClass(status)}`}
                >
                  {statusLabels[status] || status}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <div className="text-xs text-muted-foreground leading-tight">
            <code className="bg-muted px-1.5 py-0.5 rounded">{slug}</code>
          </div>
          <div className="flex items-center gap-1 pt-1.5 border-t">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0"
              asChild
            >
              <Link to={`/positions/${slug}` as any}>
                <Eye className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 w-6 p-0"
              asChild
            >
              <Link to={`/positions/${slug}/edit` as any}>
                <Pencil className="h-3 w-3" />
              </Link>
            </Button>
            <div className="ml-auto">
              <DeletePositionButton positionId={id} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionKanbanCard;
