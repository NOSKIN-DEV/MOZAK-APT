import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Configuración común de los mapas (Etapa 16).
 *
 * - Teselas de OpenStreetMap: sin clave ni costo, con la atribución que exige
 *   su política de uso. Sirven para un prototipo con poco tráfico; para producción
 *   hay que usar un proveedor de teselas (ver docs/MAPA.md).
 * - Los pines se dibujan con CSS (clases .mozak-pin en globals.css) en lugar de
 *   las imágenes por defecto de Leaflet, que se rompen al empaquetar con webpack.
 *
 * Este módulo usa `window` al cargarse: solo se importa desde componentes que se
 * cargan con next/dynamic y { ssr: false }.
 */

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function addBaseLayer(map: L.Map): void {
  L.tileLayer(OSM_TILE_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
}

/** Pin redondo con el número de eventos del lugar; el seleccionado es más grande y naranjo. */
export function placePinIcon(count: number, selected: boolean): L.DivIcon {
  const size = selected ? 44 : 36;
  const label = count > 99 ? "99+" : String(count);
  return L.divIcon({
    // className vacío: evita el recuadro blanco que Leaflet pone por defecto en los divIcon.
    className: "",
    html: `<span class="mozak-pin${selected ? " mozak-pin--selected" : ""}">${label}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Marcador del lugar elegido en el formulario del creador. */
export function pickedPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: '<span class="mozak-pin mozak-pin--selected mozak-pin--picked"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

