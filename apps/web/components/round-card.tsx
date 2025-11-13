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
import { Badge } from "@workspace/ui/components/badge";
import { Eye, Pencil } from "lucide-react";
import DeleteRoundButton from "./delete-round-button";

interface Position {
  id: string;
  name: string;
}

interface RoundCardProps {
  round: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    positions: Position[];
  };
}

const RoundCard = ({ round }: RoundCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{round.name}</CardTitle>
        {round.positions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {round.positions.map((position) => (
              <Badge key={position.id} variant="secondary">
                {position.name}
              </Badge>
            ))}
          </div>
        )}
        {round.positions.length === 0 && (
          <Badge variant="outline" className="mt-2">
            No position linked
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {round.description ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {round.description}
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
            <Link href={`/rounds/${round.id}`}>
              <Eye className="h-4 w-4" />
              View
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rounds/${round.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteRoundButton roundId={round.id} />
        </div>
      </CardFooter>
    </Card>
  );
};

export default RoundCard;

