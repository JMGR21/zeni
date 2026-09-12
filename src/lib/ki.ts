export type KiLevel = {
  label: string;
  colorToken: string;
  min: number;
  max: number;
};

// Rangos de Ki definidos en CLAUDE.md, en orden ascendente. colorToken
// corresponde a un token de color en globals.css (usable como
// var(--color-{colorToken})).
export const KI_LEVELS: readonly KiLevel[] = [
  { label: "Modo Supervivencia", colorToken: "ki-survival", min: 0, max: 15 },
  { label: "Ki Dormido", colorToken: "ki-dormant", min: 16, max: 35 },
  { label: "Ki Despertando", colorToken: "ki-awakening", min: 36, max: 50 },
  { label: "Guerrero Z", colorToken: "ki-warrior", min: 51, max: 65 },
  { label: "Super Saiyan", colorToken: "ki-saiyan", min: 66, max: 85 },
  { label: "Super Saiyan 2", colorToken: "ki-saiyan2", min: 86, max: 100 },
];

export function getKiLevel(score: number): KiLevel {
  const clamped = Math.min(100, Math.max(0, score));
  return (
    KI_LEVELS.find((level) => clamped >= level.min && clamped <= level.max) ??
    KI_LEVELS[0]
  );
}

// Posición de una etiqueta de Ki dentro del orden ascendente (0 = Modo
// Supervivencia). Usado para detectar Transformaciones comparando el rango
// de un mes contra el anterior. `null` si la etiqueta no coincide con
// ninguna conocida (dato viejo/corrupto).
export function getKiLevelRank(label: string): number | null {
  const index = KI_LEVELS.findIndex((level) => level.label === label);
  return index === -1 ? null : index;
}
