"use client";

import { useState } from "react";

/**
 * Multimedia del detalle de evento (Etapa 10).
 *
 * - EventPosterBackdrop: el afiche del evento como fondo de TODA la página
 *   de detalle (fijo, desenfocado y atenuado para no restar legibilidad).
 * - EventMediaHero: cabecera de la tarjeta. El afiche ocupa el fondo y,
 *   encima, se reproduce el video promocional del evento. Si el evento no
 *   tiene video, se muestra su foto (imageUrl) enmarcada sobre el afiche.
 *
 * Todo es opcional: sin afiche ni video la cabecera cae a la imagen
 * original o a un ícono, igual que antes de esta etapa.
 */

interface EventMediaProps {
  title: string;
  /** Foto principal del evento (imageUrl). */
  imageUrl: string | null;
  posterImageUrl: string | null;
  videoUrl: string | null;
}

/** Fondo fijo de página. El contenedor padre debe tener `relative isolate`. */
export function EventPosterBackdrop({ posterImageUrl }: { posterImageUrl: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!posterImageUrl || failed) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- afiche local o externo, sin optimización necesaria en el prototipo */}
      <img
        src={posterImageUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full scale-110 object-cover blur-2xl"
      />
      <div className="absolute inset-0 bg-gray-50/85 dark:bg-gray-950/90" />
    </div>
  );
}

export function EventMediaHero({ title, imageUrl, posterImageUrl, videoUrl }: EventMediaProps) {
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const poster = posterImageUrl && !posterFailed ? posterImageUrl : null;
  const video = videoUrl && !videoFailed ? videoUrl : null;
  // Sin afiche, la foto del evento hace de fondo (comportamiento previo a la Etapa 10).
  const background = poster ?? imageUrl;
  // Encima del fondo va el video; si no hay video, la foto enmarcada (solo si el fondo es el afiche).
  const framedPhoto = !video && poster ? imageUrl : null;

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
      {background ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen local o externa, sin optimización necesaria en el prototipo
        <img
          src={background}
          alt={poster ? "" : title}
          onError={poster ? () => setPosterFailed(true) : undefined}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl" aria-hidden>
          🗓️
        </div>
      )}

      {video && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-3 sm:p-8">
          <video
            src={video}
            poster={imageUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={`Video promocional de ${title}`}
            onError={() => setVideoFailed(true)}
            className="max-h-[85%] max-w-[85%] rounded-lg bg-black shadow-2xl ring-1 ring-white/20"
          >
            Tu navegador no puede reproducir este video.
          </video>
        </div>
      )}

      {framedPhoto && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-3 sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa, sin optimización necesaria en el prototipo */}
          <img
            src={framedPhoto}
            alt={title}
            className="max-h-[85%] max-w-[85%] rounded-lg object-contain shadow-2xl ring-1 ring-white/20"
          />
        </div>
      )}
    </div>
  );
}
