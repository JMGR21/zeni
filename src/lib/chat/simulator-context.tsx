"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { SimulatorInputOverrides } from "@/lib/chat/simulator-input-schema";

type SimulatorInputContextValue = {
  value: SimulatorInputOverrides | null;
  register: (input: SimulatorInputOverrides | null) => void;
};

const SimulatorInputContext = createContext<SimulatorInputContextValue | null>(null);

/**
 * Puente entre el simulador de flujo de efectivo (cliente, sin Server
 * Action) y el panel de chat: mientras el simulador está montado, registra
 * su estado en vivo aquí; el panel lo lee al enviar un mensaje para que la
 * tool `run_cashflow_simulation` pueda usarlo como base. Montado una sola
 * vez en `(app)/layout.tsx`.
 */
export function SimulatorInputProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SimulatorInputOverrides | null>(null);
  return <SimulatorInputContext.Provider value={{ value, register: setValue }}>{children}</SimulatorInputContext.Provider>;
}

/** Llamado por el componente del simulador mientras está montado; se limpia solo al desmontar. */
export function useRegisterSimulatorInput(input: SimulatorInputOverrides | null) {
  const ctx = useContext(SimulatorInputContext);
  const register = ctx?.register;

  useEffect(() => {
    register?.(input);
    return () => register?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se compara por contenido serializado, no por referencia, para no reinscribir en cada render del simulador
  }, [register, JSON.stringify(input)]);
}

export function useSimulatorInputSnapshot(): SimulatorInputOverrides | null {
  const ctx = useContext(SimulatorInputContext);
  return ctx?.value ?? null;
}
