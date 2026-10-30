import { describe, expect, it } from "vitest";
import { buildAddressQuery, buildGoogleMapsUrl, hasUsableCoordinates } from "./maps";

/** Lee de vuelta el parámetro `query` de la URL, tal como lo recibiría Google Maps. */
function queryOf(url: string | null): string | null {
  if (!url) return null;
  return new URL(url).searchParams.get("query");
}

describe("hasUsableCoordinates", () => {
  it("acepta coordenadas de Chile (hemisferio sur y oeste)", () => {
    expect(hasUsableCoordinates(-33.4372, -70.6506)).toBe(true);
  });

  it("acepta los extremos del rango", () => {
    expect(hasUsableCoordinates(90, 180)).toBe(true);
    expect(hasUsableCoordinates(-90, -180)).toBe(true);
  });

  it.each([
    ["latitud fuera de rango", 91, 10],
    ["longitud fuera de rango", 10, 181],
    ["NaN", Number.NaN, 10],
    ["Infinity", 10, Number.POSITIVE_INFINITY],
    ["punto (0, 0), que indica dato vacío", 0, 0],
  ])("rechaza %s", (_name, lat, lng) => {
    expect(hasUsableCoordinates(lat, lng)).toBe(false);
  });

  it("rechaza valores ausentes", () => {
    expect(hasUsableCoordinates(undefined, -70)).toBe(false);
    expect(hasUsableCoordinates(-33, null)).toBe(false);
  });

  it("acepta una sola coordenada en cero (el ecuador o el meridiano de Greenwich no son «vacío»)", () => {
    expect(hasUsableCoordinates(0, -70.6)).toBe(true);
    expect(hasUsableCoordinates(-33.4, 0)).toBe(true);
  });
});

describe("buildGoogleMapsUrl — con coordenadas", () => {
  it("arma la URL oficial de búsqueda con latitud y longitud", () => {
    expect(buildGoogleMapsUrl({ latitude: -33.4372, longitude: -70.6506 })).toBe(
      "https://www.google.com/maps/search/?api=1&query=-33.4372,-70.6506",
    );
  });

  it("apunta a google.com/maps y no depende de ninguna clave de API", () => {
    const url = new URL(buildGoogleMapsUrl({ latitude: -33.4372, longitude: -70.6506 }) as string);
    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/search/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.has("key")).toBe(false);
  });

  it("limita a 6 decimales y evita la notación científica", () => {
    expect(queryOf(buildGoogleMapsUrl({ latitude: -33.123456789, longitude: -70.987654321 }))).toBe("-33.123457,-70.987654");
    expect(queryOf(buildGoogleMapsUrl({ latitude: 1e-9, longitude: -70.5 }))).toBe("0,-70.5");
  });

  it("prefiere las coordenadas aunque también haya dirección", () => {
    const url = buildGoogleMapsUrl({
      latitude: -33.45,
      longitude: -70.66,
      address: "Av. Libertador Bernardo O'Higgins 651",
      commune: "Santiago",
    });
    expect(queryOf(url)).toBe("-33.45,-70.66");
  });
});

describe("buildGoogleMapsUrl — respaldo por dirección", () => {
  it("usa «dirección, comuna, Chile» cuando no hay coordenadas", () => {
    const url = buildGoogleMapsUrl({ address: "Av. Providencia 1234", commune: "Providencia" });
    expect(queryOf(url)).toBe("Av. Providencia 1234, Providencia, Chile");
  });

  it("usa la dirección cuando las coordenadas no son utilizables", () => {
    const url = buildGoogleMapsUrl({
      latitude: 0,
      longitude: 0,
      address: "Camino El Alba 11595",
      commune: "Las Condes",
    });
    expect(queryOf(url)).toBe("Camino El Alba 11595, Las Condes, Chile");
  });

  it("codifica tildes, ñ, espacios y símbolos reservados para que no rompan la URL", () => {
    const address = "Pasaje Ñuñoa #45 & Av. Grecia/Irarrázaval ?=50%";
    const url = buildGoogleMapsUrl({ address, commune: "Ñuñoa" }) as string;

    // La URL conserva un único parámetro `query`: los símbolos reservados no lo parten ni agregan otros.
    const parsed = new URL(url);
    expect([...parsed.searchParams.keys()]).toEqual(["api", "query"]);
    expect(parsed.searchParams.get("query")).toBe(`${address}, Ñuñoa, Chile`);

    // Y en el texto crudo de la URL solo quedan caracteres seguros: todo lo demás va como %XX.
    const raw = url.slice(url.indexOf("query=") + "query=".length);
    expect(raw).toMatch(/^[A-Za-z0-9\-_.!~*'()%]+$/);
    expect(raw).not.toMatch(/%(?![0-9A-F]{2})/);
    expect(raw).toContain("%C3%91"); // Ñ
    expect(raw).toContain("%23"); // #
    expect(raw).toContain("%26"); // &
  });

  it("no deja pasar caracteres de control ni espacios repetidos", () => {
    const url = buildGoogleMapsUrl({ address: "Av.\u0000  Apoquindo\n\t4500", commune: "  Las   Condes " });
    expect(queryOf(url)).toBe("Av. Apoquindo 4500, Las Condes, Chile");
  });

  it("no puede inyectar parámetros adicionales a través de la dirección", () => {
    const url = buildGoogleMapsUrl({ address: "Calle 1&api=2&key=ROBADA", commune: "X" }) as string;
    const parsed = new URL(url);
    expect(parsed.searchParams.get("api")).toBe("1");
    expect(parsed.searchParams.has("key")).toBe(false);
  });

  it("omite la comuna si viene vacía", () => {
    expect(queryOf(buildGoogleMapsUrl({ address: "Plaza de Armas s/n", commune: "  " }))).toBe("Plaza de Armas s/n, Chile");
  });
});

describe("buildGoogleMapsUrl — sin datos de ubicación", () => {
  it("devuelve null si no hay coordenadas ni dirección", () => {
    expect(buildGoogleMapsUrl({})).toBeNull();
    expect(buildGoogleMapsUrl({ latitude: null, longitude: null, address: null, commune: null })).toBeNull();
  });

  it("devuelve null si la dirección está vacía o es solo espacios, aunque haya comuna", () => {
    expect(buildGoogleMapsUrl({ address: "   ", commune: "Santiago" })).toBeNull();
    expect(buildGoogleMapsUrl({ address: "\u0000\n", commune: "Santiago" })).toBeNull();
  });

  it("devuelve null con coordenadas inválidas y sin dirección", () => {
    expect(buildGoogleMapsUrl({ latitude: 200, longitude: -70 })).toBeNull();
  });
});

describe("buildAddressQuery", () => {
  it("devuelve cadena vacía cuando no hay dirección", () => {
    expect(buildAddressQuery(undefined, "Santiago")).toBe("");
  });

  it("agrega «Chile» para evitar confundir ciudades homónimas", () => {
    expect(buildAddressQuery("Av. Matta 100", "Santiago")).toBe("Av. Matta 100, Santiago, Chile");
  });
});
