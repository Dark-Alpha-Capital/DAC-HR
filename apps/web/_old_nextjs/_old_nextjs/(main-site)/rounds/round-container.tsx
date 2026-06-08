"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import DeleteRoundButton from "@/components/delete-round-button";
import { Badge } from "@workspace/ui/components/badge";

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
          <TableHead className="text-right py-1.5 px-2 text-xs">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rounds.map((round, index) => (
          <TableRow key={round.id}>
            <TableCell className="py-1.5 px-2 text-sm text-muted-foreground">
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
            <TableCell className="text-right py-1.5 px-2">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0"
                  asChild
                >
                  <Link href={`/rounds/${round.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0"
                  asChild
                >
                  <Link href={`/rounds/${round.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <DeleteRoundButton roundId={round.id} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default RoundContainer;
