"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { cn } from "cn";
import { updateAvatar } from "@/app/(app)/settings/actions";
import { AvatarImage } from "@/components/avatar-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AVATARS } from "@/lib/avatars";

export function AvatarPickerDialog({ avatarId }: { avatarId: string | null }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function selectAvatar(id: string) {
    startTransition(() => updateAvatar(id));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Cambiar imagen de perfil"
            className="group relative flex size-24 items-center justify-center rounded-full"
          />
        }
      >
        <AvatarImage avatarId={avatarId} size={96} className="ring-2 ring-ink-muted/15 transition-colors group-hover:ring-ki-awakening/50" />
        <span className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border-2 border-void bg-ki-awakening text-void shadow-md transition-transform group-hover:scale-110">
          <Pencil className="size-3.5" />
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="font-mono text-xs tracking-widest text-ink-muted uppercase">Avatar</div>
          <DialogTitle>Elige tu personaje</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4 py-1 sm:grid-cols-5">
          {AVATARS.map((avatar) => {
            const selected = avatar.id === avatarId;
            return (
              <button
                key={avatar.id}
                type="button"
                aria-label={avatar.name}
                aria-pressed={selected}
                disabled={isPending}
                onClick={() => selectAvatar(avatar.id)}
                className="group flex flex-col items-center gap-1.5 disabled:pointer-events-none disabled:opacity-50"
              >
                <AvatarImage
                  avatarId={avatar.id}
                  size={72}
                  className={cn(
                    "ring-2 ring-offset-2 ring-offset-surface transition-all group-hover:scale-105",
                    selected ? "ring-ki-awakening" : "ring-transparent group-hover:ring-ink-muted/40",
                  )}
                />
                <span
                  className={cn(
                    "truncate text-[11px]",
                    selected ? "font-medium text-ink" : "text-ink-muted",
                  )}
                >
                  {avatar.name}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
