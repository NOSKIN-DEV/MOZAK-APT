import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance, groupByPlace, nearestGroup, placeKey, SANTIAGO_CENTER } from "./geo";

const VALPARAISO = { latitude: -33.0472, longitude: -71.6127 };

describe("distanceKm", () => {
  it("es cero para el mismo punto", () => {
    expect(distanceKm(SANTIAGO_CENTER, SANTIAGO_CENTER)).toBe(0);
  });

  it("Santiago–Valparaíso en línea recta mide unos 98 km", () => {
    expect(distanceKm(SANTIAGO_CENTER, VALPARAISO)).toBeCloseTo(98.45, 1);
  });

  it("es simétrica", () => {
    expect(distanceKm(VALPARAISO, SANTIAGO_CENTER)).toBeCloseTo(distanceKm(SANTIAGO_CENTER, VALPARAISO), 9);
  });

  it("0,01° de latitud son unos 1,1 km", () => {
    const north = { latitude: SANTIAGO_CENTER.latitude + 0.01, longitude: SANTIAGO_CENTER.longitude };
    expect(distanceKm(SANTIAGO_CENTER, north)).toBeCloseTo(1.112, 2);
  });
});

describe("formatDistance", () => {
  it.each([
    [0, "10 m"],
    [0.004, "10 m"],
    [0.346, "350 m"],
    [0.996, "1,0 km"],
    [2.44, "2,4 km"],
    [9.94, "9,9 km"],
    [12.4, "12 km"],
    [98.45, "98 km"],
  ])("%s km → %s", (km, text) => {
    expect(formatDistance(km)).toBe(text);
  });

  it("devuelve vacío para valores no válidos", () => {
    expect(formatDistance(Number.NaN)).toBe("");
    expect(formatDistance(-1)).toBe("");
    expect(formatDistance(Number.POSITIVE_INFINITY)).toBe("");
  });
});

interface Item {
  id: string;
  venue: { name: string; latitude: number; longitude: number };
}

const item = (id: string, name: string, latitude: number, longitude: number): Item => ({ id, venue: { name, latitude, longitude } });
const placeOf = (i: Item) => i.venue;

describe("groupByPlace", () => {
  it("junta en un punto los eventos del mismo lugar y conserva el orden", () => {
    const items = [
      item("e1", "Teatro A", -33.44, -70.65),
      item("e2", "Parque B", -33.42, -70.6),
      item("e3", "Teatro A", -33.44, -70.65),
    ];
    const groups = groupByPlace(items, placeOf);
    expect(groups.map((g) => g.key)).toEqual([placeKey(-33.44, -70.65), placeKey(-33.42, -70.6)]);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["e1", "e3"]);
    expect(groups[0]?.name).toBe("Teatro A");
  });

  it("omite los eventos sin coordenadas utilizables (incluido el punto 0,0)", () => {
    const items = [item("e1", "Sin ubicación", 0, 0), item("e2", "Fuera de rango", 120, 10), item("e3", "Ok", -33.4, -70.6)];
    const groups = groupByPlace(items, placeOf);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["e3"]);
  });

  it("sin eventos no hay puntos", () => {
    expect(groupByPlace([], placeOf)).toEqual([]);
  });
});

describe("nearestGroup", () => {
  it("elige el lugar más cercano al usuario", () => {
    const groups = groupByPlace(
      [item("lejos", "Valparaíso", VALPARAISO.latitude, VALPARAISO.longitude), item("cerca", "Centro", -33.45, -70.66)],
      placeOf,
    );
    expect(nearestGroup(groups, SANTIAGO_CENTER)?.name).toBe("Centro");
  });

  it("devuelve null si no hay lugares", () => {
    expect(nearestGroup([], SANTIAGO_CENTER)).toBeNull();
  });
});
