import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APT | Descubre qué hacer cerca de ti",
  description:
    "Plataforma de descubrimiento de eventos, cultura y entretenimiento (prototipo académico).",
};

/**
 * Se ejecuta antes de que React hidrate la página, para aplicar la
 * clase "dark" (o dejarla sin aplicar) sin que se alcance a ver un
 * parpadeo del tema incorrecto. Lee la preferencia guardada en
 * localStorage; si no hay ninguna, usa la preferencia del sistema
 * operativo (prefers-color-scheme).
 */
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("apt-theme");
    var isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
