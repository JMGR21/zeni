export function AppFooter() {
  return (
    // El FAB flotante (crear movimiento/Dragón) es `fixed right-6 bottom-6
    // size-14` en varias pantallas — sin este padding extra en móvil, el
    // texto centrado del footer queda debajo del botón cuando se hace
    // scroll hasta el final (ver auditoría responsive).
    <footer className="border-t border-ink-muted/10 bg-void px-6 pt-4 pb-20 text-center text-[11px] text-ink-muted sm:pb-4">
      Iconos de fantasía por{" "}
      <a
        href="https://game-icons.net"
        target="_blank"
        rel="noreferrer"
        className="underline decoration-ink-muted/30 underline-offset-2 hover:text-ink-muted"
      >
        Game-icons.net
      </a>{" "}
      (CC BY 3.0)
    </footer>
  );
}
