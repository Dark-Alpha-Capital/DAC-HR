import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, HelpCircle, Loader2 } from "lucide-react";
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
import { AddRoundQuestionDialog } from "~/components/dialogs/add-round-question-dialog";
import { PositionRoundQuestionItem } from "~/components/position-round-question-item";
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
}

export function PositionRoundSheet({
  positionId,
  positionName,
  round,
  open,
  onOpenChange,
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
          <SheetTitle className="pr-8 text-xl">
            {displayRound?.name ?? "Round"}
          </SheetTitle>
          <SheetDescription>
            Interview round for {positionName}
          </SheetDescription>
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

                <section className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Questions</h3>
                      <Badge variant="secondary">{questions.length}</Badge>
                    </div>
                    {roundId ? (
                      <AddRoundQuestionDialog
                        positionId={positionId}
                        positionName={positionName}
                        roundId={roundId}
                        roundName={displayRound?.name ?? "this round"}
                        onQuestionAdded={() => refetch()}
                      />
                    ) : null}
                  </div>

                  {questions.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                      <HelpCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50" />
                      <p className="mb-5 text-sm text-muted-foreground">
                        No questions in this round yet.
                      </p>
                      {roundId ? (
                        <AddRoundQuestionDialog
                          positionId={positionId}
                          positionName={positionName}
                          roundId={roundId}
                          roundName={displayRound?.name ?? "this round"}
                          onQuestionAdded={() => refetch()}
                          variant="empty-state"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <PositionRoundQuestionItem
                          key={question.id}
                          question={question}
                          index={index}
                          onChanged={() => refetch()}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
