import { buildGoogleMapsUrl } from "@/lib/maps";

interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
  /** Dirección y comuna: respaldo para el enlace a Google Maps si las coordenadas no sirven. */
  address?: string;
  commune?: string;
}

/**
 * Ubicación del evento (RF-06 + HU-28).
 *
 * - Mapa embebido con OpenStreetMap: no requiere API key ni credenciales. Es la
 *   representación mínima de «ubicación básica» del documento de requisitos.
 * - Botón «Abrir en Google Maps» (Etapa 14, MA-47): enlace oficial de Maps URLs,
 *   que tampoco requiere clave. Complementa al mapa embebido (no lo reemplaza,
 *   porque un mapa de Google incrustado sí exige clave y cuenta de facturación).
 *   Si no hay coordenadas ni dirección utilizables, el botón no se muestra.
 */
export function EventLocationMap({ latitude, longitude, label, address, commune }: EventLocationMapProps) {
  const delta = 0.01;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}&layer=mapnik`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  const googleMapsUrl = buildGoogleMapsUrl({ latitude, longitude, address, commune });

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <iframe
          title={`Mapa de ubicación: ${label}`}
          src={embedSrc}
          className="h-56 w-full sm:h-64"
          loading="lazy"
        />
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
          >
            Abrir en Google Maps
          </a>
        )}
        <a
          href={fullMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-700 hover:underline dark:text-green-400"
        >
          Ver mapa más grande
        </a>
      </div>
    </div>
  );
}
