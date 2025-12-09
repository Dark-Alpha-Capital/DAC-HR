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
import type { InferSelectModel } from "drizzle-orm";
import type { position } from "@workspace/db/schema";
import DeletePositionButton from "./delete-position-button";
import { Badge } from "@workspace/ui/components/badge";

const hireLevelLabels: Record<string, string> = {
  "managing-director": "Managing Director",
  "vice-president": "Vice President",
  "associate-analyst": "Associate Analyst",
  "intern": "Intern",
};

interface PositionCardProps {
  positionId: string;
  positionName: string;
  positionDescription: string;
  positionSlug: string;
  hireLevel?: string | null;
}

const PositionCard = ({
  positionId,
  positionName,
  positionDescription,
  positionSlug,
  hireLevel,
}: PositionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{positionName}</CardTitle>
          {hireLevel && (
            <Badge variant="secondary" className="text-xs">
              {hireLevelLabels[hireLevel] || hireLevel}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {positionDescription ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {positionDescription}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No description provided
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/positions/${positionSlug}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
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
