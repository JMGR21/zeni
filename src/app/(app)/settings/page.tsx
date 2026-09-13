import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { AppHeader } from "@/components/app-header";
import { AvatarPickerDialog } from "@/components/avatar-picker-dialog";
import { SettingsForm } from "@/components/settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, currency, avatar_id")
    .eq("id", user.id)
    .single<{ name: string | null; currency: string | null; avatar_id: string | null }>();

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <AppHeader active="settings" />

      <section className="mx-auto w-full max-w-md px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-ink">Configuración</h1>
        <p className="mt-1 text-sm text-ink-muted">Tu perfil y preferencias.</p>

        <div className="mt-8 flex items-center gap-4">
          <AvatarPickerDialog avatarId={profile?.avatar_id ?? null} />
          <div>
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Avatar</p>
            <p className="text-sm text-ink-muted">Toca tu imagen para elegir otro personaje.</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Correo</label>
          <p className="rounded-lg border border-ink-muted/15 bg-void/40 px-2.5 py-2 text-sm text-ink-muted">
            {user.email}
          </p>
        </div>

        <div className="mt-6">
          <SettingsForm initialName={profile?.name ?? ""} initialCurrency={profile?.currency ?? "MXN"} />
        </div>

        <div className="mt-8 border-t border-ink-muted/10 pt-6">
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-destructive"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
