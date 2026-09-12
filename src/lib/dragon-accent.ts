export type DragonAccent = "savings" | "debt" | "completed";

// Paleta fija (no personalizable) para diferenciar Dragones a simple vista:
// ahorro, deuda y completado usan tonos de Ki distintos entre sí y distintos
// del rojo `ki-survival`, que ya está reservado para alertas (presupuesto
// excedido, deuda impagable) — así un Dragón de deuda no se confunde con su
// propia alerta de "no pagable".
export const DRAGON_ACCENT_STYLES: Record<
  DragonAccent,
  { colorVar: string; bar: string; text: string }
> = {
  savings: { colorVar: "var(--color-ki-saiyan)", bar: "bg-ki-saiyan", text: "text-ki-saiyan" },
  debt: { colorVar: "var(--color-ki-warrior)", bar: "bg-ki-warrior", text: "text-ki-warrior" },
  completed: { colorVar: "var(--color-ki-saiyan2)", bar: "bg-ki-saiyan2", text: "text-ki-saiyan2" },
};

export function getDragonAccent(dragon: { type: "savings" | "debt"; status: "active" | "completed" }): DragonAccent {
  if (dragon.status === "completed") return "completed";
  return dragon.type;
}
