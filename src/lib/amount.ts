// Solo dígitos y un único punto decimal, máximo 2 decimales — así el valor
// siempre es seguro de convertir con Number() sin importar si viene del
// teclado físico o del teclado en pantalla.
export function sanitizeAmountInput(raw: string) {
  let value = raw.replace(/[^0-9.]/g, "");
  const firstDot = value.indexOf(".");
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replaceAll(".", "");
  }
  const [wholePart, decimalPart] = value.split(".");
  return decimalPart === undefined ? wholePart : `${wholePart}.${decimalPart.slice(0, 2)}`;
}
