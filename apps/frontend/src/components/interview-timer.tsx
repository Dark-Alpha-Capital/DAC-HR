"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "~/lib/utils";

interface InterviewTimerProps {
  durationMs: number;
  startedAt: Date;
  token: string;
  onExpire: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function InterviewTimer({
  durationMs,
  startedAt,
  token,
  onExpire,
}: InterviewTimerProps) {
  const storageKey = `interview-start-${token}`;

  const resolvedStartedAt = (() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return new Date(parseInt(stored, 10));
      }
    }
    return startedAt;
  })();

  const [remainingMs, setRemainingMs] = useState(
    () => Math.max(0, durationMs - (Date.now() - resolvedStartedAt.getTime())),
  );

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, startedAt.getTime().toString());
      }
    }

    if (remainingMs <= 0) {
      onExpireRef.current();
      return;
    }

    const id = setInterval(() => {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(storageKey)
          : null;
      const origin = stored ? new Date(parseInt(stored, 10)) : startedAt;
      const next = Math.max(0, durationMs - (Date.now() - origin.getTime()));
      setRemainingMs(next);
      if (next <= 0) {
        clearInterval(id);
        onExpireRef.current();
      }
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const isWarning = remainingMs <= 5 * 60 * 1000;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-2xl font-mono tabular-nums",
        isWarning && "text-red-600 dark:text-red-400 font-bold",
      )}
    >
      <Clock className={cn("h-5 w-5", isWarning && "text-red-600 dark:text-red-400")} />
      {formatTime(remainingMs)}
    </div>
  );
}
