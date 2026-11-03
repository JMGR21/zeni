"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { formatRelativeDays } from "@/lib/relative-time";
import type { ChatThread } from "@/lib/chat/types";

type ThreadSummary = Pick<ChatThread, "id" | "title" | "updated_at">;

/**
 * Lista de conversaciones guardadas del usuario (`GET /api/chat/threads`),
 * ordenadas por actividad más reciente. Seleccionar una la carga en
 * `ChatPanel` vía `loadThread`; no hay borrado todavía, solo ver/elegir.
 */
export function ChatHistoryList({
  activeThreadId,
  onSelect,
}: {
  activeThreadId: string | undefined;
  onSelect: (threadId: string) => void;
}) {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/chat/threads")
      .then((response) => (response.ok ? response.json() : { threads: [] }))
      .then((data: { threads: ThreadSummary[] }) => {
        if (active) setThreads(data.threads ?? []);
      })
      .catch(() => {
        if (active) setThreads([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (threads === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-muted">
        Todavía no tienes conversaciones guardadas.
      </div>
    );
  }

  return (
    <div className="themed-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => onSelect(thread.id)}
          className={
            thread.id === activeThreadId
              ? "flex w-full items-center gap-2.5 rounded-lg bg-ki-awakening/10 px-3 py-2.5 text-left"
              : "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ink-muted/10"
          }
        >
          <MessageSquareText className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">{thread.title}</span>
            <span className="block text-[11px] text-ink-muted">{formatRelativeDays(thread.updated_at)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
