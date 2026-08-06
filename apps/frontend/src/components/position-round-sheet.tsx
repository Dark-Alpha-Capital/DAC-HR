import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { EditRoundDialog } from "~/components/dialogs/edit-round-dialog";
import DeleteRoundButton from "~/components/delete-round-button";
import { RoundQuestionsSection } from "~/components/round-questions-section";
import { loadRoundById } from "~/lib/loaders/rounds";
import { queryKeys } from "~/lib/query/query-keys";
import { formatDate } from "~/lib/utils";

type RoundSummary = {
  id: string;
  name: string;
  description: string | null;
};

interface PositionRoundSheetProps {
  positionId: string;
  positionName: string;
  round: RoundSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoundUpdated?: () => void;
  onRoundDeleted?: (roundId: string) => void | Promise<void>;
}

export function PositionRoundSheet({
  positionId,
  positionName,
  round,
  open,
  onOpenChange,
  onRoundUpdated,
  onRoundDeleted,
}: PositionRoundSheetProps) {
  const roundId = round?.id ?? "";

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.rounds.detail(roundId),
    queryFn: () => loadRoundById({ data: roundId }),
    enabled: open && Boolean(roundId),
  });

  const roundData = data?.round ?? null;
  const displayRound = roundData ?? round;
  const questions = data?.questions ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="shrink-0 space-y-1.5 border-b px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl">
                {displayRound?.name ?? "Round"}
              </SheetTitle>
              <SheetDescription>
                Interview round for {positionName}
              </SheetDescription>
            </div>
            {roundId ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <EditRoundDialog
                  round={{
                    id: roundId,
                    name: displayRound?.name ?? round?.name ?? "",
                    description:
                      displayRound?.description ?? round?.description ?? null,
                  }}
                  onSaved={() => {
                    void refetch();
                    onRoundUpdated?.();
                  }}
                />
                <DeleteRoundButton
                  roundId={roundId}
                  onDeleted={async () => {
                    onOpenChange(false);
                    await onRoundDeleted?.(roundId);
                  }}
                />
              </div>
            ) : null}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-8 px-6 py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading round...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {roundData?.createdAt ? (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      Created {formatDate(roundData.createdAt)}
                    </Badge>
                  ) : null}
                  {roundData?.updatedAt &&
                  roundData.createdAt &&
                  new Date(roundData.updatedAt).getTime() !==
                    new Date(roundData.createdAt).getTime() ? (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(roundData.updatedAt)}
                    </Badge>
                  ) : null}
                </div>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Description</h3>
                  {roundData?.description ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {roundData.description}
                    </p>
                  ) : displayRound?.description ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {displayRound.description}
                    </p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      No description provided.
                    </p>
                  )}
                </section>

                <Separator />

                <RoundQuestionsSection
                  roundId={roundId}
                  roundName={displayRound?.name ?? "this round"}
                  positionId={positionId}
                  positionName={positionName}
                  questions={questions}
                  onChanged={() => refetch()}
                  variant="compact"
                />
              </>
            )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
