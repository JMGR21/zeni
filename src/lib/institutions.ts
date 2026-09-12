export const INSTITUTIONS = [
  { id: "azteca", name: "Banco Azteca", kind: "rate", referenceRate: 70.0 },
  { id: "bbva", name: "BBVA", kind: "rate", referenceRate: 59.5 },
  { id: "nu", name: "Nu", kind: "rate", referenceRate: 93.6 },
  { id: "klar", name: "Klar", kind: "rate", referenceRate: 123.1 },
  { id: "mercadopago", name: "Mercado Pago", kind: "rate", referenceRate: 76.9 },
  { id: "coppel", name: "Coppel", kind: "rate", referenceRate: 69.4 },
  { id: "kueski", name: "Kueski", kind: "fixed_plan" },
  { id: "aplazo", name: "Aplazo", kind: "fixed_plan" },
] as const;

export type Institution = (typeof INSTITUTIONS)[number];
export type InstitutionId = Institution["id"];

export function getInstitution(id: string | null | undefined): Institution | null {
  return INSTITUTIONS.find((institution) => institution.id === id) ?? null;
}

export function getReferenceRate(id: string | null | undefined): number | null {
  const institution = getInstitution(id);
  return institution?.kind === "rate" ? institution.referenceRate : null;
}
