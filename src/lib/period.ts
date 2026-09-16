// "Periodo" generaliza el mes calendario: el usuario puede elegir un día
// (1-28, para que exista en todos los meses incluido febrero) en el que
// arranca cada periodo, en vez de forzar siempre el día 1. Todo el
// dashboard (balance, gráficas, Ki, XP mensual) sigue operando sobre
// "meses", solo que el límite entre uno y otro ya no es fijo.
export type PeriodRange = { start: Date; end: Date }; // end es exclusivo

function clampStartDay(day: number): number {
  return Math.min(28, Math.max(1, Math.floor(day)));
}

// Fecha de inicio del periodo que contiene `reference`, dado el día en que
// arranca cada periodo.
export function computePeriodStart(reference: Date, startDay: number): Date {
  const day = clampStartDay(startDay);
  if (reference.getDate() < day) {
    return new Date(reference.getFullYear(), reference.getMonth() - 1, day);
  }
  return new Date(reference.getFullYear(), reference.getMonth(), day);
}

export function periodRangeFromStart(start: Date, startDay: number): PeriodRange {
  const day = clampStartDay(startDay);
  return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, day) };
}

export function shiftPeriodStart(start: Date, startDay: number, offsetPeriods: number): Date {
  const day = clampStartDay(startDay);
  return new Date(start.getFullYear(), start.getMonth() + offsetPeriods, day);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parsePeriodISODate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}
