import { User } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { signOut } from "@/app/(auth)/actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/budget", label: "Presupuesto" },
] as const;

export function AppHeader({ active }: { active: "dashboard" | "budget" }) {
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
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Cerrar sesión"
          className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <User className="size-5" />
        </button>
      </form>
    </header>
  );
}
