// Kueski/Aplazo quedan fuera de esta versión del chat (spec original: "no
// crees tratamiento para ellos"). El filtro es por INSTITUCIÓN, no por
// `payment_schedule` — hoy `payment_schedule = "fixed_plan"` solo lo produce
// elegir una de estas dos instituciones (ver `dragons/actions.ts`:
// `institution?.kind === "fixed_plan" ? "fixed_plan" : "amortized"`, y en
// `institutions.ts` solo "kueski"/"aplazo" tienen `kind: "fixed_plan"`), pero
// esa es una coincidencia de los datos actuales, no la regla — si
// `institutions.ts` agregara otra institución con `kind: "fixed_plan"`, una
// deuda de esa institución NO debe excluirse. Usado en las tres superficies
// que tocan deudas (`get_dragon_detail`, `simulate_debt_payoff`,
// `run_cashflow_simulation`) para que la exclusión sea consistente.
export const KUESKI_APLAZO_INSTITUTIONS = ["kueski", "aplazo"] as const;

// `institution` en `dragons` siempre debería ser el id fijo de `institutions.ts`
// (minúsculas, sin espacios — `institution?.id` en `dragons/actions.ts`), pero
// se normaliza igual (trim + lowercase) por si algún dato viejo o una futura
// vía de escritura no pasa por ese mismo Server Action.
export function isKueskiOrAplazo(institution: string | null): boolean {
  if (institution === null) return false;
  const normalized = institution.trim().toLowerCase();
  return (KUESKI_APLAZO_INSTITUTIONS as readonly string[]).includes(normalized);
}
