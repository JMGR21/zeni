"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { signOut } from "@/app/(auth)/actions";
import { AvatarImage } from "@/components/avatar-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileMenu({ active = false, avatarId = null }: { active?: boolean; avatarId?: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Perfil"
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface",
              active ? "ring-2 ring-ki-awakening/50" : "hover:ring-2 hover:ring-ink-muted/20",
            )}
          />
        }
      >
        <AvatarImage avatarId={avatarId} size={32} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" aria-hidden="true" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
