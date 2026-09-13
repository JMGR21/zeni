import Link from "next/link";
import { cn } from "cn";
import { ProfileMenu } from "@/components/profile-menu";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Movimientos" },
  { href: "/budget", label: "Presupuesto" },
  { href: "/dragons", label: "Dragones" },
  { href: "/training", label: "Entrenamiento" },
  { href: "/categories", label: "Categorías" },
] as const;

export async function AppHeader({
  active,
}: {
  active: "dashboard" | "transactions" | "budget" | "dragons" | "training" | "categories" | "settings";
}) {
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
        <span className="font-display text-xl font-bold tracking-[0.2em]">ZENI</span>
        <nav className="flex items-center gap-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors",
                active === item.href.slice(1) ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <ProfileMenu active={active === "settings"} avatarId={avatarId} />
    </header>
  );
}
