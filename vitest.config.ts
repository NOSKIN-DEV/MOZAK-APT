import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configuración de Vitest (Etapa 8 — Épica APT-8).
 *
 * - entorno "node": las pruebas cubren lógica pura y rutas de la API
 *   interna (App Router), no componentes React, así que no se necesita
 *   un DOM simulado.
 * - alias "@/*": replica el path mapping de tsconfig.json para que los
 *   imports del código de producción (@/lib/..., @/data, @/types)
 *   funcionen igual dentro de las pruebas.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: ["default"],
  },
});
