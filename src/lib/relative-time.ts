export function formatRelativeDays(dateIso: string, now: Date = new Date()): string {
  const diffDays = Math.floor((now.getTime() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "hoy";
  if (diffDays === 1) return "hace 1 día";
  if (diffDays < 30) return `hace ${diffDays} días`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "hace 1 mes";
  if (diffMonths < 12) return `hace ${diffMonths} meses`;

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? "hace 1 año" : `hace ${diffYears} años`;
}
