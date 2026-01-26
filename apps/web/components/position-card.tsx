import React from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Eye, Pencil } from "lucide-react";
import DeletePositionButton from "./delete-position-button";
import { Badge } from "@workspace/ui/components/badge";

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

interface PositionCardProps {
  positionId: string;
  positionName: string;
  positionDescription: string;
  positionSlug: string;
  hireLevel?: string | null;
  status?: string | null;
}

const PositionCard = ({
  positionId,
  positionName,
  positionDescription,
  positionSlug,
  hireLevel,
  status,
}: PositionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{positionName}</CardTitle>
          <div className="flex flex-col items-end gap-1">
            {status && (
              <Badge
                variant="secondary"
                className={`text-xs ${getStatusColorClass(status)}`}
              >
                {statusLabels[status] || status}
              </Badge>
            )}
            {hireLevel && (
              <Badge variant="secondary" className="text-xs">
                {hireLevelLabels[hireLevel] || hireLevel}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/positions/${positionSlug}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/positions/${positionSlug}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          <DeletePositionButton positionId={positionId} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default PositionCard;
