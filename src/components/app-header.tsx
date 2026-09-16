import Image from "next/image";
import { AppNav } from "@/components/app-nav";
import { ProfileMenu } from "@/components/profile-menu";
import { createClient } from "@/lib/supabase/server";

// Vive en el layout compartido de (app), no en cada página, para que se
// monte una sola vez y no participe de los Suspense boundaries de
// loading.tsx — la nav debe sentirse fija, como el shell de una app, no
// recargarse junto con el contenido de cada pantalla.
export async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let avatarId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_id")
      .eq("id", user.id)
      .single<{ avatar_id: string | null }>();
    avatarId = profile?.avatar_id ?? null;
  }

  return (
    <header className="flex items-center justify-between border-b border-ink-muted/10 px-6 py-4">
      <div className="flex items-center gap-8">
        <span className="flex items-center gap-2">
          <Image src="/brand/zeni-icon.png" alt="" width={24} height={24} className="size-6" />
          <span className="font-display text-xl font-bold tracking-[0.2em]">ZENI</span>
        </span>
        <AppNav />
      </div>
      <ProfileMenu avatarId={avatarId} />
    </header>
  );
}
