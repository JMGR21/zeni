// Frases temáticas para el saludo del dashboard — mismo tono que el resto
// de la app ("Bienvenido de vuelta, guerrero", "Verificando ki..."). Una
// por día (determinístico vía día del año), para que no cambie en cada
// recarga de la misma sesión.
const QUOTES: readonly string[] = [
  "Tu Ki crece con cada movimiento que registras.",
  "Ni Freezer superó tanta constancia — sigue así.",
  "Cada Zeni ahorrado te acerca a Super Saiyan.",
  "Un guerrero legendario también cuida su Zeni.",
  "El entrenamiento no se detiene, ni tampoco tu progreso financiero.",
  "Hoy es un buen día para acercarte un poco más a tu próxima Transformación.",
  "Incluso Goku llevaba la cuenta de sus Esferas del Dragón.",
  "La disciplina de hoy es el Ki de mañana.",
  "Un pequeño ahorro también puede ser un Kamehameha a tus metas.",
  "Vegeta no se rendía, y tus Dragones tampoco deberían esperar.",
];

export function getDailyQuote(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
