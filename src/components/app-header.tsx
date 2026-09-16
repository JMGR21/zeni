import Image from "next/image";
import { AppNav } from "@/components/app-nav";
import { ProfileMenu } from "@/components/profile-menu";
import { getTotalBalance } from "@/lib/total-balance";
import { createClient } from "@/lib/supabase/server";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

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
  let availableBalance: number | null = null;
  if (user) {
    const [{ data: profile }, totalBalance] = await Promise.all([
      supabase.from("profiles").select("avatar_id").eq("id", user.id).single<{ avatar_id: string | null }>(),
      getTotalBalance(supabase, user.id),
    ]);
    avatarId = profile?.avatar_id ?? null;
    availableBalance = totalBalance.availableBalance;
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
      <div className="flex items-center gap-3">
        {availableBalance !== null && (
          <div className="hidden text-right leading-tight sm:block">
            <div className="flex items-center justify-end gap-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-ki-awakening"
                style={{ animation: "scouter-blink 1.6s ease-in-out infinite" }}
              />
              <p className="font-mono text-[10px] tracking-widest text-ink-muted uppercase">Saldo</p>
            </div>
            <p className="font-mono text-sm font-semibold text-ki-awakening">
              {currencyFormatter.format(availableBalance)}
            </p>
          </div>
        )}
        {/* Anillos de radar detrás del avatar, mismo lenguaje que el
            "target lock" del Scouter (ScouterHud) y el pulso del FAB de
            registro — reutilizan `scouter-pulse`, sin glow (borde con
            opacidad, no blur), consistente con la regla de glow acotado al
            KiGauge y la Transformación. */}
        <div className="relative shrink-0">
          {availableBalance !== null && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border border-ki-awakening/60"
                style={{ animation: "scouter-pulse 3s ease-out infinite" }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border border-ki-awakening/60"
                style={{ animation: "scouter-pulse 3s ease-out infinite", animationDelay: "1.5s" }}
              />
            </>
          )}
          <ProfileMenu avatarId={avatarId} />
        </div>
      </div>
    </header>
  );
}
