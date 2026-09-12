import { GiDragonHead } from "react-icons/gi";

type DragonMotifProps = {
  color?: string;
  size?: number;
  className?: string;
};

// Icono de Game Icons (Game-icons.net, CC BY 3.0) — no es arte de Dragon Ball,
// pero comparte el lenguaje visual. Sin glow: ese efecto queda reservado al
// arco del KiGauge.
export function DragonMotif({ color = "var(--color-ki-awakening)", size = 40, className }: DragonMotifProps) {
  return <GiDragonHead size={size} color={color} className={className} aria-hidden="true" />;
}
