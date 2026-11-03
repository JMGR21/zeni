"use client";

import { useCallback, useRef, useState } from "react";
import { useSimulatorInputSnapshot } from "@/lib/chat/simulator-context";

export type ChatUiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatStatus = "idle" | "streaming" | "error" | "limit_reached";

type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; name: string }
  | { type: "error"; message: string }
  | { type: "done"; threadId: string; messageId: string | null; title: string | null };

export function useChatStream() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const simulatorInput = useSimulatorInputSnapshot();
  const nextLocalId = useRef(0);

  const startNewThread = useCallback(() => {
    setThreadId(undefined);
    setTitle(null);
    setMessages([]);
    setStatus("idle");
    setErrorMessage(null);
    setActiveTool(null);
  }, []);

  const loadThread = useCallback((thread: { id: string; title: string }, history: ChatUiMessage[]) => {
    setThreadId(thread.id);
    setTitle(thread.title);
    setMessages(history);
    setStatus("idle");
    setErrorMessage(null);
    setActiveTool(null);
  }, []);

  // Optimista: el título cambia de inmediato en la UI; si el `PATCH` falla
  // no hay rollback (no es un dato crítico) — un siguiente `loadThread` de
  // ese mismo hilo volvería a leer el valor real guardado.
  const renameThread = useCallback(
    async (newTitle: string) => {
      if (!threadId) return;
      setTitle(newTitle);
      try {
        await fetch(`/api/chat/threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
      } catch {
        // Ver nota arriba — no se reintenta ni se revierte.
      }
    },
    [threadId],
  );

  const send = useCallback(
    async (message: string) => {
      const userMessage: ChatUiMessage = { id: `local-${nextLocalId.current++}`, role: "user", content: message };
      const assistantId = `local-${nextLocalId.current++}`;
      setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);
      setStatus("streaming");
      setErrorMessage(null);
      setActiveTool(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            message,
            view: {
              pathname: window.location.pathname,
              searchParams: Object.fromEntries(new URLSearchParams(window.location.search)),
            },
            ...(simulatorInput ? { simulatorInput } : {}),
          }),
        });

        if (response.status === 429) {
          setStatus("limit_reached");
          return;
        }
        if (!response.ok || !response.body) {
          setStatus("error");
          setErrorMessage("No se pudo conectar con el chat.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "text") {
              setActiveTool(null);
              setMessages((prev) =>
                prev.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + event.delta } : msg)),
              );
            } else if (event.type === "tool_call") {
              setActiveTool(event.name);
            } else if (event.type === "error") {
              setStatus("error");
              setActiveTool(null);
              setErrorMessage(event.message);
            } else if (event.type === "done") {
              setThreadId(event.threadId);
              if (event.title) setTitle(event.title);
              setStatus("idle");
              setActiveTool(null);
            }
          }
        }
      } catch {
        setStatus("error");
        setActiveTool(null);
        setErrorMessage("Error de red.");
      }
    },
    [threadId, simulatorInput],
  );

  return { threadId, title, messages, status, errorMessage, activeTool, send, loadThread, startNewThread, renameThread };
}
