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

interface PositionCardProps {
  positionId: string;
  positionName: string;
  positionDescription: string;
  positionSlug: string;
}

const PositionCard = ({
  positionId,
  positionName,
  positionDescription,
  positionSlug,
}: PositionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{positionName}</CardTitle>
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
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/positions/${positionSlug}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeletePositionButton positionId={positionId} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default PositionCard;
