"use client";

import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

import DeletePositionButton from "@/components/delete-position-button";

export interface PositionKanbanCardProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const PositionKanbanCard = ({
  id,
  name,
  slug,
  description,
}: PositionKanbanCardProps) => {
  return (
    <Card
      key={id}
      className="hover:shadow-sm transition-shadow py-2 px-2"
    >
      <CardContent className="p-2">
        <div className="space-y-1.5">
          <div>
            <h4 className="font-medium leading-tight text-sm">{name}</h4>
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
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              asChild
            >
              <Link href={`/positions/${slug}`}>
                <Eye className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              asChild
            >
              <Link href={`/positions/${slug}/edit`}>
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


