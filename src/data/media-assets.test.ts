import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { events } from "./events";
import { eventSchema } from "@/lib/schemas";

/**
 * Etapa 10 — afiche y video del evento.
 *
 * Verifica que los datos mock cumplan el contrato del modelo (afiche y
 * video opcionales, solo rutas locales o URLs http/https) y que cada
 * archivo local referenciado exista de verdad en /public. Así un afiche
 * o video mal escrito falla aquí y no como una imagen rota en pantalla.
 */
const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

function localPath(url: string): string {
  return path.join(publicDir, url);
}

describe("multimedia de eventos (afiche y video)", () => {
  it("todos los eventos mock siguen cumpliendo eventSchema con los campos nuevos", () => {
    for (const event of events) {
      expect(eventSchema.safeParse(event).success, `evento ${event.id}`).toBe(true);
    }
  });

  it("los 24 eventos tienen afiche, y solo algunos tienen video (para probar ambos casos)", () => {
    expect(events.filter((e) => e.posterImageUrl !== null)).toHaveLength(24);

    const withVideo = events.filter((e) => e.videoUrl !== null);
    expect(withVideo.length).toBeGreaterThan(0);
    expect(withVideo.length).toBeLessThan(events.length);
  });

  it("al menos un evento no tiene foto (imageUrl) pero sí afiche, para probar el fondo sin foto", () => {
    expect(events.some((e) => e.imageUrl === null && e.posterImageUrl !== null)).toBe(true);
  });

  it("cada afiche local referenciado existe en /public", () => {
    for (const event of events) {
      if (event.posterImageUrl?.startsWith("/")) {
        expect(existsSync(localPath(event.posterImageUrl)), `${event.id}: ${event.posterImageUrl}`).toBe(true);
      }
    }
  });

  it("cada video local referenciado existe en /public", () => {
    for (const event of events) {
      if (event.videoUrl?.startsWith("/")) {
        expect(existsSync(localPath(event.videoUrl)), `${event.id}: ${event.videoUrl}`).toBe(true);
      }
    }
  });

  describe("validación de rutas multimedia", () => {
    const base = events[0]!;

    it.each(["/media/posters/x.svg", "https://cdn.example.com/poster.jpg", "http://example.com/v.mp4"])(
      "acepta %s",
      (url) => {
        expect(eventSchema.safeParse({ ...base, posterImageUrl: url, videoUrl: url }).success).toBe(true);
      },
    );

    it("acepta null (el afiche y el video son opcionales)", () => {
      expect(eventSchema.safeParse({ ...base, posterImageUrl: null, videoUrl: null }).success).toBe(true);
    });

    it.each(["", "media/x.svg", "//evil.example.com/x.mp4", "javascript:alert(1)", "ftp://example.com/x.mp4", "/con espacio.svg"])(
      "rechaza %j",
      (url) => {
        expect(eventSchema.safeParse({ ...base, posterImageUrl: url }).success).toBe(false);
        expect(eventSchema.safeParse({ ...base, videoUrl: url }).success).toBe(false);
      },
    );
  });
});
