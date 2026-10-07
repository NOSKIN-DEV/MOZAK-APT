import { describe, expect, it } from "vitest";
import { GET } from "./route";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

/**
 * Épica APT-8 (Sprint 2), historia APT-89 — pruebas de integración de
 * GET /api/events/[id]: 200 con el evento serializado cuando existe,
 * 404 con un mensaje claro cuando no.
 */
describe("GET /api/events/[id]", () => {
  it("responde 200 con el evento serializado cuando el id existe", async () => {
    const response = await GET(new Request("http://localhost:3000/api/events/event-002"), context("event-002"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.id).toBe("event-002");
    expect(body.data.title).toBe("Concierto de jazz en el parque");
    expect(body.data.venue.commune).toBe("Providencia");
  });

  // Etapa 10: afiche de fondo y video sobre el afiche
  it("incluye el afiche y el video del evento cuando los tiene", async () => {
    const response = await GET(new Request("http://localhost:3000/api/events/event-002"), context("event-002"));
    const body = await response.json();
    expect(body.data.posterImageUrl).toBe("/media/posters/event-002.svg");
    expect(body.data.videoUrl).toBe("/media/videos/promo-a.mp4");
  });

  it("devuelve videoUrl en null (y el afiche igual) cuando el evento no tiene video", async () => {
    const response = await GET(new Request("http://localhost:3000/api/events/event-005"), context("event-005"));
    const body = await response.json();
    expect(body.data.posterImageUrl).toBe("/media/posters/event-005.svg");
    expect(body.data.videoUrl).toBeNull();
  });

  it("responde 404 con un mensaje claro cuando el id no existe", async () => {
    const response = await GET(new Request("http://localhost:3000/api/events/event-999"), context("event-999"));
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('Evento "event-999" no encontrado');
  });
});
