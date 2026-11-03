"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, History, Loader2, Pencil, Plus, SendHorizontal, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { ChatHistoryList } from "@/components/chat/chat-history-list";
import { useChatStream, type ChatUiMessage } from "@/hooks/use-chat-stream";

const TOOL_LABELS: Record<string, string> = {
  get_ki_breakdown: "Revisando tu Ki",
  get_period_summary: "Revisando tu periodo",
  get_budget_status: "Revisando tu presupuesto",
  get_fifty_thirty_twenty: "Revisando tu 50/30/20",
  get_dragon_detail: "Revisando tu Dragón",
  simulate_debt_payoff: "Simulando estrategias de pago",
  get_projection: "Revisando tu proyección",
  run_cashflow_simulation: "Corriendo la simulación de flujo",
  query_transactions: "Buscando en tus movimientos",
  get_level_and_achievements: "Revisando tu Nivel y logros",
};

const MAX_TEXTAREA_HEIGHT = 120;

/**
 * Panel de chat hecho a mano — el proyecto no tiene `Sheet`/`Drawer` en
 * `components/ui`, así que se sigue el mismo patrón ya usado para otros
 * componentes hand-rolled (`wizard-controls.tsx`, `dashboard-search.tsx`):
 * un panel fijo con los tokens de color ya establecidos.
 */
export function ChatPanel({ onClose }: { onClose: () => void }) {
  const { threadId, title, messages, status, errorMessage, activeTool, send, loadThread, startNewThread, renameThread } =
    useChatStream();
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"chat" | "history">("chat");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreaming = status === "streaming";
  const isLocked = isStreaming || status === "limit_reached";
  const lastMessage = messages.at(-1);
  const isWaitingForAssistant = isStreaming && lastMessage?.role === "assistant" && lastMessage.content === "";

  // Al abrir el panel, reanuda la conversación más reciente del usuario si
  // existe (continuar sesiones de chat) — si falla o no hay ninguna, el
  // chat simplemente arranca en blanco, sin bloquear la UI.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const listResponse = await fetch("/api/chat/threads");
        if (!listResponse.ok) return;
        const { threads } = (await listResponse.json()) as { threads: { id: string }[] };
        const latest = threads[0];
        if (!latest || !active) return;

        const detailResponse = await fetch(`/api/chat/threads/${latest.id}`);
        if (!detailResponse.ok || !active) return;
        const detail = (await detailResponse.json()) as {
          thread: { id: string; title: string };
          messages: ChatUiMessage[];
        };
        if (active) loadThread(detail.thread, detail.messages);
      } catch {
        // Silencioso — el chat arranca en blanco si no se pudo reanudar.
      }
    })();
    return () => {
      active = false;
    };
  }, [loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeTool, status]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [draft]);

  useEffect(() => {
    if (!isStreaming && view === "chat") textareaRef.current?.focus();
  }, [isStreaming, view]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isLocked) return;
    setDraft("");
    void send(trimmed);
  }

  function startEditingTitle() {
    if (!threadId) return;
    setTitleDraft(title ?? "");
    setIsEditingTitle(true);
  }

  function commitTitle() {
    setIsEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === title) return;
    void renameThread(trimmed);
  }

  async function handleSelectThread(selectedId: string) {
    setView("chat");
    if (selectedId === threadId) return;
    try {
      const response = await fetch(`/api/chat/threads/${selectedId}`);
      if (!response.ok) return;
      const detail = (await response.json()) as { thread: { id: string; title: string }; messages: ChatUiMessage[] };
      loadThread(detail.thread, detail.messages);
    } catch {
      // Silencioso — se queda en la conversación que ya tenía abierta.
    }
  }

  return (
    // Overlay flotante, no participa del layout (no empuja ni es `sticky`
    // dentro del flex del resto de la app) — en móvil pantalla completa por
    // espacio; a partir de `sm` es una tarjeta flotante junto al FAB
    // (bottom-6 left-6), con alto acotado a la pantalla (`max-h-[min(640px,calc(100dvh-3rem))]`)
    // para que nunca pueda superarla.
    <div className="animate-in fade-in-0 slide-in-from-bottom-4 fixed inset-0 z-50 flex flex-col overflow-hidden border border-ink-muted/15 bg-surface duration-200 sm:inset-auto sm:bottom-6 sm:left-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[380px] sm:rounded-xl sm:shadow-2xl">
      {view === "history" ? (
        <div className="flex items-center gap-2 border-b border-ink-muted/10 px-2 py-3">
          <Button variant="ghost" size="icon" onClick={() => setView("chat")} aria-label="Volver al chat">
            <ArrowLeft className="size-4" />
          </Button>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">Historial</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 border-b border-ink-muted/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-ink-muted uppercase">
              Asistente Zeni · Solo lectura
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-ki-awakening"
                style={{ animation: "scouter-blink 1.6s ease-in-out infinite" }}
              />
            </p>
            {isEditingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTitle();
                  }
                  if (event.key === "Escape") setIsEditingTitle(false);
                }}
                className="mt-0.5 w-full rounded border border-ki-awakening/50 bg-void/40 px-1.5 py-0.5 font-display text-sm font-semibold text-ink outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={startEditingTitle}
                disabled={!threadId}
                className="group mt-0.5 flex w-full items-center gap-1.5 truncate text-left font-display text-sm font-semibold text-ink disabled:cursor-default"
              >
                <span className="truncate">{title ?? "Nueva conversación"}</span>
                {threadId && (
                  <Pencil className="size-3 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={startNewThread} aria-label="Nueva conversación">
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setView("history")} aria-label="Ver historial">
              <History className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar chat">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {view === "history" ? (
        <ChatHistoryList activeThreadId={threadId} onSelect={handleSelectThread} />
      ) : (
        <>
          <div ref={scrollRef} className="themed-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="animate-in fade-in-0 rounded-xl border border-ink-muted/15 bg-void/40 px-3 py-3 text-sm text-ink-muted duration-300">
                Pregúntame sobre tu Ki, tus Dragones, tu presupuesto o corre una simulación. No puedo registrar,
                editar ni eliminar nada todavía.
              </div>
            )}

            {messages.map((message) => {
              if (message.role === "assistant" && message.content === "") return null;
              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "animate-in fade-in-0 slide-in-from-bottom-1 flex justify-end duration-200"
                      : "animate-in fade-in-0 slide-in-from-bottom-1 space-y-1 duration-200"
                  }
                >
                  {message.role === "user" ? (
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ki-awakening/10 px-3 py-2 text-sm whitespace-pre-wrap text-ink">
                      {message.content}
                    </p>
                  ) : (
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-ink-muted/10 bg-void/40 px-3 py-2">
                      <ChatMarkdown content={message.content} />
                    </div>
                  )}
                  {message.role === "assistant" && (
                    <p className="px-1 text-[11px] text-ink-muted/70">Zeni no es asesor financiero.</p>
                  )}
                </div>
              );
            })}

            {isWaitingForAssistant &&
              (activeTool ? (
                <div className="animate-in fade-in-0 flex items-center gap-2 rounded-2xl rounded-bl-md border border-ink-muted/10 bg-void/40 px-3 py-2 text-xs text-ink-muted duration-200">
                  <Loader2 className="size-3.5 animate-spin text-ki-awakening" />
                  {TOOL_LABELS[activeTool] ?? "Consultando tus datos"}...
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-ink-muted/10 bg-void/40 px-3.5 py-3">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="size-1.5 rounded-full bg-ink-muted/60"
                      style={{
                        animation: "chat-typing-dot 1.2s ease-in-out infinite",
                        animationDelay: `${dot * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              ))}

            {status === "error" && (
              <div className="animate-in fade-in-0 flex items-start gap-2 rounded-xl border border-ki-survival/20 bg-ki-survival/10 px-3 py-2.5 text-sm text-ki-survival duration-200">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {errorMessage ?? "Ocurrió un error. Intenta de nuevo."}
              </div>
            )}

            {status === "limit_reached" && (
              <div className="animate-in fade-in-0 flex items-start gap-2 rounded-xl border border-ki-survival/20 bg-ki-survival/10 px-3 py-2.5 text-sm text-ki-survival duration-200">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Llegaste al límite de mensajes de hoy. Vuelve a intentarlo mañana.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-ink-muted/10 p-3">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              rows={1}
              placeholder="Escribe tu pregunta..."
              disabled={status === "limit_reached"}
              className="themed-scrollbar flex-1 resize-none rounded-lg border border-ink-muted/15 bg-void/40 px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ki-awakening/50 focus:outline-none disabled:opacity-50"
            />
            <Button type="submit" size="icon" disabled={isLocked || !draft.trim()} aria-label="Enviar mensaje">
              {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
