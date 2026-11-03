import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { Toaster } from "@/components/ui/sonner";
import { ChatWidget } from "@/components/chat/chat-widget";
import { SimulatorInputProvider } from "@/lib/chat/simulator-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <SimulatorInputProvider>
      <div className="flex min-h-dvh flex-col bg-void text-ink">
        <AppHeader />
        {children}
        <AppFooter />
        {/* Flotante (fixed overlay) — no participa del layout ni empuja el
            contenido, ver `chat-panel.tsx`. */}
        <ChatWidget />
        <Toaster />
      </div>
    </SimulatorInputProvider>
  );
}
