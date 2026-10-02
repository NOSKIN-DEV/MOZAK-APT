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
  output: "standalone",
  images: {
    // Se ampliará cuando se integren imágenes reales de fuentes externas.
    remotePatterns: [],
  },
};

export default nextConfig;
