import { describe, expect, it } from "vitest";
import { isKueskiOrAplazo } from "@/lib/chat/kueski-aplazo-institutions";

describe("isKueskiOrAplazo", () => {
  it("detecta los ids exactos del catálogo", () => {
    expect(isKueskiOrAplazo("kueski")).toBe(true);
    expect(isKueskiOrAplazo("aplazo")).toBe(true);
  });

  it("normaliza mayúsculas y espacios extra", () => {
    expect(isKueskiOrAplazo("Kueski")).toBe(true);
    expect(isKueskiOrAplazo("KUESKI")).toBe(true);
    expect(isKueskiOrAplazo(" aplazo ")).toBe(true);
    expect(isKueskiOrAplazo("Aplazo")).toBe(true);
  });

  it("no detecta otras instituciones ni null", () => {
    expect(isKueskiOrAplazo("bbva")).toBe(false);
    expect(isKueskiOrAplazo("otra-institucion")).toBe(false);
    expect(isKueskiOrAplazo(null)).toBe(false);
  });
});
