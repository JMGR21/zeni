import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Detalle de un hilo: título + mensajes completos, para repoblar la UI al
 * elegir una conversación del historial (o al reanudar la más reciente al
 * abrir el chat).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/chat/threads/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; title: string }>();
  if (!thread) return Response.json({ error: "not_found" }, { status: 404 });

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .returns<{ id: string; role: "user" | "assistant"; content: string }[]>();

  return Response.json({ thread, messages: messages ?? [] });
}

const renameSchema = z.object({ title: z.string().trim().min(1).max(120) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/chat/threads/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: renamed, error } = await supabase
    .from("chat_threads")
    .update({ title: parsed.data.title })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) return Response.json({ error: "could_not_rename" }, { status: 500 });
  if (!renamed) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json({ ok: true });
}
