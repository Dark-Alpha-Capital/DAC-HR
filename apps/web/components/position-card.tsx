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

type Position = InferSelectModel<typeof position>;

interface PositionCardProps {
  position: Position;
}

const PositionCard = ({ position }: PositionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{position.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {position.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {position.description}
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
            <Link href={`/positions/${position.slug}`}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/positions/${position.slug}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeletePositionButton positionId={position.id} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default PositionCard;
