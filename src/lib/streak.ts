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

function daysBetween(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const fromUTC = Date.UTC(fy, fm - 1, fd);
  const toUTC = Date.UTC(ty, tm - 1, td);
  return Math.round((toUTC - fromUTC) / (1000 * 60 * 60 * 24));
}

/**
 * Racha activa "flexible" para los logros de Entrenamiento (Categoría A del
 * Sistema de Logros) — distinta de `computeCurrentStreak` de arriba: no
 * exige actividad diaria, solo se reinicia si pasan 7+ días consecutivos
 * sin ningún registro (incluyendo el hueco entre el último registro y
 * `today`). Si no está rota, la longitud es la cantidad de días desde el
 * inicio de la racha activa hasta `today` (inclusive).
 */
export function computeActiveStreakDays(activityDates: Date[], today: Date): number {
  if (activityDates.length === 0) return 0;

  const sortedDays = Array.from(new Set(activityDates.map(toISODate))).sort();
  const todayKey = toISODate(today);
  const lastDayKey = sortedDays[sortedDays.length - 1];

  if (daysBetween(lastDayKey, todayKey) >= 7) return 0;

  let startIndex = sortedDays.length - 1;
  for (let i = sortedDays.length - 1; i > 0; i--) {
    if (daysBetween(sortedDays[i - 1], sortedDays[i]) >= 7) break;
    startIndex = i - 1;
  }

  return daysBetween(sortedDays[startIndex], todayKey) + 1;
}

// Casos de referencia para computeActiveStreakDays (ver también
// src/lib/streak.test.ts):
// 1. Racha continua sin huecos: actividad todos los días del 1 al 10,
//    today = día 10 -> streak = 10.
// 2. Huecos pequeños (3-4 días) no rompen la racha: actividad en los días
//    1, 5, 9 (huecos de 3-4 días), today = día 9 -> streak = 9 (cuenta
//    desde el día 1, el inicio de la racha activa).
// 3. Racha rota por un hueco de 7+ días en medio: actividad en el día 1 y
//    luego el día 10 (hueco de 9 días), today = día 10 -> streak = 1 (solo
//    cuenta desde el día 10, el hueco anterior reinició la racha).
// 4. Racha actualmente rota por inactividad reciente: última actividad hace
//    10 días, today = ahora -> streak = 0 (el hueco hasta hoy ya es de 7+).
