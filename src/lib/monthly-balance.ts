// "Colchón": un ingreso marcado como `reserved_for_next_period` se sigue
// contando con normalidad en el mes/periodo en que ocurrió (rawBalance no
// lo excluye), pero si al final el mes lo necesitó (balance bruto
// negativo), ese ingreso es quien primero lo cubre; lo que sobra se
// traslada UN SOLO periodo hacia adelante, nunca en cascada.
export type MonthTotals = {
  income: number;
  expense: number;
  reservedIncome: number;
};

export function computeMonthBalanceWithReserve(
  income: number,
  expense: number,
  reservedIncome: number,
): { rawBalance: number; bufferCarriedForward: number } {
  const rawBalance = income - expense;
  // Ojo: el "faltante" es sobre el balance total del mes (expense - income),
  // no sobre income menos el colchón — si el mes ya cerró en positivo, el
  // colchón completo sobrevive aunque por sí solo el ingreso no reservado
  // no hubiera alcanzado para cubrir el gasto.
  const shortfall = Math.max(0, expense - income);
  const bufferUsedThisMonth = Math.min(shortfall, reservedIncome);
  const bufferCarriedForward = reservedIncome - bufferUsedThisMonth;
  return { rawBalance, bufferCarriedForward };
}

export function computeNetBalance(rawBalance: number, incomingBuffer: number): number {
  return rawBalance + incomingBuffer;
}

// Colchón que entra a un mes/periodo, derivado de los totales del
// mes/periodo INMEDIATAMENTE anterior — un solo salto, nunca se le pasa el
// colchón entrante del propio `previous` para evitar cascada.
export function computeIncomingBuffer(previous: MonthTotals): number {
  return computeMonthBalanceWithReserve(previous.income, previous.expense, previous.reservedIncome).bufferCarriedForward;
}
