import { describe, expect, it } from "vitest";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/system-prompt";

describe("CHAT_SYSTEM_PROMPT", () => {
  it("instruye no calcular pagos/intereses/fechas para deudas de Kueski o Aplazo", () => {
    expect(CHAT_SYSTEM_PROMPT).toMatch(/Kueski/);
    expect(CHAT_SYSTEM_PROMPT).toMatch(/Aplazo/);
    expect(CHAT_SYSTEM_PROMPT).toMatch(/no calcules pagos, intereses ni fechas/i);
    expect(CHAT_SYSTEM_PROMPT).toMatch(/\/dragons/);
  });

  it("instruye avisar cuando una deuda queda fuera de un resultado, antes de dar totales", () => {
    expect(CHAT_SYSTEM_PROMPT).toMatch(/no incluya una deuda activa/i);
    expect(CHAT_SYSTEM_PROMPT).toMatch(/ANTES de dar cualquier total/);
    expect(CHAT_SYSTEM_PROMPT).toMatch(/No presentes un total o resultado como si fuera completo/i);
  });
});
