"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "cn";
import { getAvatar } from "@/lib/avatars";

export function AvatarImage({
  avatarId,
  size = 36,
  className,
}: {
  avatarId: string | null;
  size?: number;
  className?: string;
}) {
  const avatar = getAvatar(avatarId);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <User className="pointer-events-none absolute size-1/2 text-ink-muted" aria-hidden="true" />
      {avatar && (
        <Image
          src={avatar.src}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
