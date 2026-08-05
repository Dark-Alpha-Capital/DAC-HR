import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  ATTENDANCE_SYNC_CHUNK_SIZE,
  prepareAttendanceSync,
  syncAttendanceChunk,
  type AttendanceSyncSeed,
} from "~/lib/actions/sync-meet-attendance";
import { queryKeys } from "~/lib/query/query-keys";

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function SyncAttendanceButton() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setStatus("Discovering meetings…");

    try {
      const prepared = await prepareAttendanceSync();
      if (prepared.error) {
        setError(prepared.error);
        setStatus(null);
        return;
      }

      const conferences = prepared.conferences;
      if (conferences.length === 0) {
        setStatus("No meetings found in the last ~30 days.");
        return;
      }

      const chunks = chunkArray(conferences, ATTENDANCE_SYNC_CHUNK_SIZE);
      let synced = 0;
      let failed = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] as AttendanceSyncSeed[];
        const from = synced + failed + 1;
        const to = Math.min(synced + failed + chunk.length, conferences.length);
        setStatus(`Syncing meetings ${from}–${to} of ${conferences.length}…`);

        const result = await syncAttendanceChunk({
          data: { conferences: chunk },
        });
        if (result.error) {
          setError(result.error);
          break;
        }
        synced += result.synced;
        failed += result.failed;
      }

      setStatus(
        failed > 0
          ? `Synced ${synced} meeting${synced === 1 ? "" : "s"} (${failed} failed).`
          : `Synced ${synced} meeting${synced === 1 ? "" : "s"}.`,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.attendance.all,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus(null);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <Button
        type="button"
        disabled={syncing}
        onClick={() => void handleSync()}
      >
        {syncing ? "Syncing…" : "Sync meeting attendance"}
      </Button>
      {status ? (
        <p className="text-xs text-muted-foreground">{status}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
