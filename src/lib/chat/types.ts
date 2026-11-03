export type ChatRole = "user" | "assistant";

export type ChatThread = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  context_snapshot: { pathname: string; searchParams: Record<string, string> } | null;
  tool_calls: { name: string }[] | null;
  created_at: string;
};

// Lo que el cliente manda sobre la pantalla desde la que se envía el mensaje.
export type ChatView = {
  pathname: string;
  searchParams: Record<string, string>;
};
