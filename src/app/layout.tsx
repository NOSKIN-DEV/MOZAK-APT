import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APT | Descubre qué hacer cerca de ti",
  description:
    "Plataforma de descubrimiento de eventos, cultura y entretenimiento (prototipo académico).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
