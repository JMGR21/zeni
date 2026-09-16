export type RecurringFrequency = "weekly" | "biweekly" | "monthly";

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function computeNextOccurrenceDate(
  frequency: RecurringFrequency,
  fromDate: Date,
  dayOfWeek?: number,
  dayOfMonth?: number,
): Date {
  if (frequency === "biweekly") {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 14);
    return next;
  }

  if (frequency === "weekly") {
    const target = dayOfWeek ?? fromDate.getDay();
    const next = new Date(fromDate);
    const diff = (target - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + diff);
    return next;
  }

  // monthly
  const target = dayOfMonth ?? fromDate.getDate();
  const nextMonthYear = fromDate.getFullYear();
  const nextMonth = fromDate.getMonth() + 1;
  const day = Math.min(target, lastDayOfMonth(nextMonthYear, nextMonth));
  return new Date(nextMonthYear, nextMonth, day);
}
