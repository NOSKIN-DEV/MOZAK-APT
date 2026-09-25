import type { NextConfig } from "next";

/**
 * Configuración base de Next.js para el prototipo APT.
 * Se mantiene simple a propósito: sin configuración avanzada
 * hasta que sea realmente necesaria (evitar sobreingeniería).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Se ampliará cuando se integren imágenes reales de fuentes externas.
    remotePatterns: [],
  },
};

export default nextConfig;
