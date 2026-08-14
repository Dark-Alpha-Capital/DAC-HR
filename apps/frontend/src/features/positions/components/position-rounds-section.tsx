import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Eye, ClipboardList } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { CreateRoundDialog } from "#/features/positions/components/create-round-dialog";
import { EditRoundDialog } from "#/features/positions/components/edit-round-dialog";
import DeleteRoundButton from "#/components/shared/delete-round-button";
import { PositionRoundSheet } from "#/features/positions/components/position-round-sheet";
import { useQueryInvalidation } from "#/hooks/use-query-invalidation";

type PositionRound = {
  id: string;
  name: string;
  description: string | null;
};

interface PositionRoundsSectionProps {
  positionId: string;
  positionName: string;
  rounds: PositionRound[];
}

export function PositionRoundsSection({
  positionId,
  positionName,
  rounds,
}: PositionRoundsSectionProps) {
  const router = useRouter();
  const invalidate = useQueryInvalidation();
  const [selectedRound, setSelectedRound] = useState<PositionRound | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const openRound = (round: PositionRound) => {
    setSelectedRound(round);
    setSheetOpen(true);
  };

  const refreshRounds = async () => {
    await Promise.all([
      router.invalidate(),
      invalidate.roundLists(),
      invalidate.positionLists(),
    ]);
  };

  const handleRoundSaved = () => {
    void refreshRounds();
  };

  const handleRoundDeleted = async (roundId: string) => {
    if (selectedRound?.id === roundId) {
      setSelectedRound(null);
      setSheetOpen(false);
    }
    await refreshRounds();
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Associated Rounds</h2>
            <CreateRoundDialog
              positionId={positionId}
              positionName={positionName}
            />
          </div>
          <Badge variant="secondary">{rounds.length}</Badge>
        </div>

        {rounds.length === 0 ? (
          <div className="rounded-md border py-8 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="mb-4 text-sm">
              No rounds are currently linked to this position.
            </p>
            <CreateRoundDialog
              positionId={positionId}
              positionName={positionName}
              variant="empty-state"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {rounds.map((round, index) => (
              <div key={round.id} className="space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-medium">{round.name}</h3>
                    {round.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {round.description}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        No description provided.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <EditRoundDialog
                      round={round}
                      onSaved={handleRoundSaved}
                    />
                    <DeleteRoundButton
                      roundId={round.id}
                      onDeleted={() => handleRoundDeleted(round.id)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openRound(round)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </div>
                </div>
                {index !== rounds.length - 1 ? (
                  <Separator className="my-2" />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <PositionRoundSheet
        positionId={positionId}
        positionName={positionName}
        round={selectedRound}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRoundUpdated={handleRoundSaved}
        onRoundDeleted={handleRoundDeleted}
      />
    </>
  );
}
