import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configuración de Vitest (Etapa 8 — Épica APT-8).
 *
 * - entorno "node": las pruebas cubren lógica pura y rutas de la API
 *   interna (App Router), no componentes React, así que no se necesita
 *   un DOM simulado.
 * - `npm run test` no requiere base de datos (las pruebas contra PostgreSQL
 *   viven en *.db.test.ts y usan vitest.db.config.ts, Etapa 11).
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
    // Las pruebas *.db.test.ts necesitan PostgreSQL: se ejecutan aparte (npm run test:db).
    exclude: [...configDefaults.exclude, "src/**/*.db.test.ts"],
    reporters: ["default"],
  },
});
