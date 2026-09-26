interface EventLocationMapProps {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Mapa embebido con OpenStreetMap (no requiere API key ni credenciales,
 * a diferencia de Google Maps). Cumple el punto 6/8 del documento:
 * "mostrar una ubicación básica del evento" — no es un mapa interactivo
 * completo, es la representación mínima suficiente para el prototipo.
 */
export function EventLocationMap({ latitude, longitude, label }: EventLocationMapProps) {
  const delta = 0.01;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${latitude},${longitude}&layer=mapnik`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

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
      <a
        href={fullMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-green-700 hover:underline dark:text-green-400"
      >
        Ver mapa más grande
      </a>
    </div>
  );
}
