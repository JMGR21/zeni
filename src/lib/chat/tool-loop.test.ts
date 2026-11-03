import { describe, expect, it } from "vitest";
import { shouldContinueToolLoop } from "@/lib/chat/tool-loop";

describe("shouldContinueToolLoop", () => {
  it("sigue iterando mientras el stop_reason sea tool_use y no se alcance el tope", () => {
    expect(shouldContinueToolLoop("tool_use", 1, 6)).toBe(true);
    expect(shouldContinueToolLoop("tool_use", 5, 6)).toBe(true);
  });

  it("corta al alcanzar el tope de iteraciones", () => {
    expect(shouldContinueToolLoop("tool_use", 6, 6)).toBe(false);
    expect(shouldContinueToolLoop("tool_use", 7, 6)).toBe(false);
  });

  it("corta siempre si el stop_reason no es tool_use, sin importar la iteración", () => {
    expect(shouldContinueToolLoop("end_turn", 1, 6)).toBe(false);
    expect(shouldContinueToolLoop("refusal", 1, 6)).toBe(false);
    expect(shouldContinueToolLoop("max_tokens", 1, 6)).toBe(false);
    expect(shouldContinueToolLoop("other", 1, 6)).toBe(false);
  });
});
