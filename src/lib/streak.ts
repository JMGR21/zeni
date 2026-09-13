function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Racha activa: días consecutivos con registro contando hacia atrás desde
 * hoy. Si hoy todavía no tiene registro, la racha sigue "viva" mientras
 * ayer sí lo tenga (el día actual no ha terminado) — si tampoco ayer tiene
 * registro, la racha está rota y es 0.
 */
export function computeCurrentStreak(activeDates: Set<string>, today: Date = new Date()): number {
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  let cursor: Date;
  if (activeDates.has(toISODate(today))) {
    cursor = today;
  } else if (activeDates.has(toISODate(yesterday))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (activeDates.has(toISODate(cursor))) {
    streak++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return streak;
}

/** Racha más larga en todo el historial (incluye la racha activa si es la más larga). */
export function computeBestStreak(activeDates: Set<string>): number {
  const sortedDates = Array.from(activeDates)
    .map((dateStr) => new Date(`${dateStr}T00:00:00`))
    .sort((a, b) => a.getTime() - b.getTime());

  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const date of sortedDates) {
    if (previous) {
      const diffDays = Math.round((date.getTime() - previous.getTime()) / 86_400_000);
      current = diffDays === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = date;
  }

  return best;
}
