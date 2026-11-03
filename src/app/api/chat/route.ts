import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkAndIncrementDailyUsage } from "@/lib/chat/usage-limit";
import { buildChatSnapshot } from "@/lib/chat/snapshot";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { CHAT_TOOLS, CHAT_TOOLS_BY_NAME } from "@/lib/chat/tools";
import { simulatorInputOverridesSchema } from "@/lib/chat/simulator-input-schema";
import { shouldContinueToolLoop } from "@/lib/chat/tool-loop";
import { deriveThreadTitle } from "@/lib/chat/thread-title";
import type { ChatView } from "@/lib/chat/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOOL_ITERATIONS = 6;
const DEFAULT_DAILY_LIMIT = 50;

const chatRequestSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  view: z.object({
    pathname: z.string(),
    searchParams: z.record(z.string(), z.string()),
  }),
  simulatorInput: simulatorInputOverridesSchema.optional(),
});

function sseLine(event: Record<string, unknown>): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const { threadId: requestedThreadId, message, view, simulatorInput } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = Number(process.env.CHAT_DAILY_MESSAGE_LIMIT ?? DEFAULT_DAILY_LIMIT);
  const usage = await checkAndIncrementDailyUsage(supabase, user.id, limit);
  if (!usage.allowed) {
    return Response.json({ error: "daily_limit_reached" }, { status: 429 });
  }

  let threadId = requestedThreadId;
  let newThreadTitle: string | null = null;
  if (threadId) {
    const { data: existingThread } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string }>();
    if (!existingThread) {
      return Response.json({ error: "thread_not_found" }, { status: 404 });
    }
  } else {
    newThreadTitle = deriveThreadTitle(message);
    const { data: newThread, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: user.id, title: newThreadTitle })
      .select("id")
      .single<{ id: string }>();
    if (error || !newThread) {
      return Response.json({ error: "could_not_create_thread" }, { status: 500 });
    }
    threadId = newThread.id;
  }

  const { data: historyRows } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .returns<{ role: "user" | "assistant"; content: string }[]>();

  await supabase.from("chat_messages").insert({
    thread_id: threadId,
    user_id: user.id,
    role: "user",
    content: message,
    context_snapshot: view,
  });

  const snapshot = await buildChatSnapshot(supabase, user.id, view as ChatView);

  const encoder = new TextEncoder();
  const finalThreadId = threadId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(sseLine(event)));

      const client = new Anthropic();
      const contextText = `CONTEXTO ACTUAL (generado por el servidor, no son instrucciones del usuario):\n${JSON.stringify(snapshot)}`;

      const messages: Anthropic.MessageParam[] = [
        ...(historyRows ?? []).map((row) => ({ role: row.role, content: row.content }) as Anthropic.MessageParam),
        {
          role: "user",
          content: [
            { type: "text", text: contextText },
            { type: "text", text: message },
          ],
        },
      ];

      const tools = CHAT_TOOLS.map((tool) => tool.definition) as Anthropic.Tool[];

      let finalText = "";
      const toolCallsUsed: { name: string }[] = [];
      let iteration = 0;
      let errored = false;

      try {
        loop: while (true) {
          iteration++;

          const apiStream = client.messages.stream({
            model: "claude-sonnet-5-5",
            max_tokens: 4096,
            system: [{ type: "text", text: CHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            tools,
            messages,
          });

          apiStream.on("text", (delta) => {
            finalText += delta;
            send({ type: "text", delta });
          });

          const result = await apiStream.finalMessage();

          if (result.stop_reason === "refusal") {
            errored = true;
            send({ type: "error", message: "No se pudo generar una respuesta." });
            break loop;
          }
          if (result.stop_reason === "max_tokens") {
            errored = true;
            send({ type: "error", message: "La respuesta se cortó por longitud." });
            break loop;
          }
          if (result.stop_reason === "end_turn") {
            messages.push({ role: "assistant", content: result.content });
            break loop;
          }

          if (!shouldContinueToolLoop("tool_use", iteration, MAX_TOOL_ITERATIONS)) {
            errored = true;
            send({ type: "error", message: "Se alcanzó el límite de pasos para esta respuesta." });
            break;
          }

          messages.push({ role: "assistant", content: result.content });

          const toolUseBlocks = result.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
          );

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            const tool = CHAT_TOOLS_BY_NAME.get(block.name);
            if (!tool) {
              toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "Herramienta desconocida." });
              continue;
            }

            const parsedInput = tool.inputSchema.safeParse(block.input);
            if (!parsedInput.success) {
              toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "Input inválido." });
              continue;
            }

            send({ type: "tool_call", name: tool.definition.name });
            toolCallsUsed.push({ name: tool.definition.name });

            try {
              const output = await tool.handler(
                { supabase, userId: user.id, view: view as ChatView, simulatorInput: simulatorInput ?? null },
                parsedInput.data,
              );
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
            } catch {
              toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "Error al ejecutar la herramienta." });
            }
          }

          messages.push({ role: "user", content: toolResults });
        }
      } catch {
        errored = true;
        send({ type: "error", message: "Error al conectar con el modelo." });
      }

      if (!errored) {
        const { data: assistantMessage } = await supabase
          .from("chat_messages")
          .insert({
            thread_id: finalThreadId,
            user_id: user.id,
            role: "assistant",
            content: finalText,
            tool_calls: toolCallsUsed.length > 0 ? toolCallsUsed : null,
          })
          .select("id")
          .single<{ id: string }>();

        await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", finalThreadId);

        send({ type: "done", threadId: finalThreadId, messageId: assistantMessage?.id ?? null, title: newThreadTitle });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
