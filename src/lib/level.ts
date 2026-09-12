export type LevelInfo = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

// XP para pasar del nivel N al N+1.
function xpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

// Nivel mínimo es 1. Suma los umbrales de cada nivel hasta encontrar dónde
// cae `totalXp`.
export function getLevelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let xpIntoLevel = Math.max(0, totalXp);
  let xpForNextLevel = xpRequiredForLevel(level);

  while (xpIntoLevel >= xpForNextLevel) {
    xpIntoLevel -= xpForNextLevel;
    level += 1;
    xpForNextLevel = xpRequiredForLevel(level);
  }

  return { level, xpIntoLevel, xpForNextLevel };
}
