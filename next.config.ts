import type { NextConfig } from "next";

/**
 * Configuración base de Next.js para el prototipo APT.
 * Se mantiene simple a propósito: sin configuración avanzada
 * hasta que sea realmente necesaria (evitar sobreingeniería).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // "standalone" genera un servidor Node.js autocontenido en .next/standalone,
  // con solo los módulos realmente usados (no todo node_modules). Es lo que
  // permite que la imagen final de Docker (Etapa 9) sea liviana.
  // En Vercel (variable VERCEL=1 durante el build, Etapa 14) se omite: Vercel
  // empaqueta la aplicación por su cuenta y no necesita el servidor autocontenido.
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    // Se ampliará cuando se integren imágenes reales de fuentes externas.
    remotePatterns: [],
  },
};

export default nextConfig;
