import * as GameIcons from "react-icons/gi";
import type { IconType } from "react-icons";

const ICONS = GameIcons as unknown as Record<string, IconType>;

/**
 * Resuelve un componente de react-icons/gi por nombre (el campo `icon` de
 * `AchievementDefinition`) — punto único para no repetir el cast en cada
 * lugar que necesita dibujar el ícono de un logro (toasts, vitrina).
 */
export function resolveGameIcon(name: string): IconType | null {
  return ICONS[name] ?? null;
}
