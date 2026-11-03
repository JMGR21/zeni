import { createClient } from "@/lib/supabase/server";

/**
 * Lista los hilos del usuario para el historial del chat (más reciente
 * primero, por `updated_at` — se actualiza en cada turno en `/api/chat`).
 * Sin mensajes, solo lo necesario para la lista — el detalle de un hilo
 * vive en `/api/chat/threads/[id]`.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .returns<{ id: string; title: string; updated_at: string }[]>();

  if (error) return Response.json({ error: "could_not_list_threads" }, { status: 500 });

  return Response.json({ threads: data ?? [] });
}
