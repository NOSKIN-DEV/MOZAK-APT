import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configuración de Vitest para las pruebas contra PostgreSQL real (Etapa 11).
 * Se usa con `npm run test:db`. Va aparte de la configuración principal para
 * que `npm run test` siga sin necesitar base de datos.
 *
 * Vitest no carga por sí solo los archivos .env en process.env, así que se
 * leen aquí (primero .env.local, que tiene prioridad, luego .env) para obtener
 * DATABASE_URL. process.loadEnvFile no pisa variables ya definidas en el
 * entorno (por ejemplo, las que pase Docker o la terminal).
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // el archivo no existe: se ignora
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    reporters: ["default"],
    // Las pruebas comparten una sola base: se ejecutan en serie.
    fileParallelism: false,
  },
});
