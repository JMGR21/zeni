import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Rajdhani } from "next/font/google";
import "./globals.css";

// Rajdhani: headlines, número de Ki, títulos de Dragón.
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// IBM Plex Sans: UI y texto general.
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// IBM Plex Mono: montos, saldos y cifras tabulares.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Zeni",
  description: "Tu entrenamiento financiero",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${rajdhani.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
