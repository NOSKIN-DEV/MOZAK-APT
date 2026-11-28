"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiEvent } from "@/lib/api";
import { formatEventDate, formatPrice } from "@/lib/format";
import { distanceKm, formatDistance, groupByPlace, nearestGroup, type LatLng, type PlaceGroup } from "@/lib/geo";
import { buildGoogleMapsUrl } from "@/lib/maps";
import type { MapFocus } from "./EventsMap";

const EventsMap = dynamic(() => import("./EventsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">Cargando mapa…</div>
  ),
});

/** La API entrega como máximo 100 eventos por petición (Etapa 13). */
const MAX_EVENTS = 100;

type LocationStatus = "locating" | "ok" | "denied" | "unavailable" | "insecure";

const LOCATION_MESSAGES: Record<Exclude<LocationStatus, "ok">, string> = {
  locating: "Buscando tu ubicación…",
  denied: "No diste permiso para usar tu ubicación. Puedes activarlo en el navegador; mientras tanto se muestra Santiago.",
  unavailable: "No se pudo obtener tu ubicación; se muestra Santiago.",
  insecure: "Tu ubicación solo se puede usar con https o en localhost; se muestra Santiago.",
};

const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Estado inicial de la ubicación. Este componente solo se carga en el navegador (MapPage usa ssr: false). */
function initialLocationStatus(): LocationStatus {
  if (!window.isSecureContext) return "insecure";
  if (!("geolocation" in navigator)) return "unavailable";
  return "locating";
}

const pillButton =
  "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-md hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800";

/**
 * Vista de mapa (Etapa 16): los eventos publicados como puntos sobre el mapa,
 * al estilo de las apps de transporte o de navegación. Al tocar un punto se abre
 * una ficha con los eventos de ese lugar, la distancia al usuario y el enlace
 * «Cómo llegar».
 */
export default function MapExplorer() {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(initialLocationStatus);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const flyTo = useCallback((target: LatLng, zoom: number) => {
    setFocus((previous) => ({ latitude: target.latitude, longitude: target.longitude, zoom, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  // Eventos publicados (la API pública nunca devuelve borradores ni eventos en revisión).
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/events?limit=${MAX_EVENTS}&sort=date_asc`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { data: ApiEvent[]; meta: { total: number } };
      })
      .then((body) => {
        setEvents(body.data);
        setTotal(body.meta.total);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("No se pudieron cargar los eventos. Intenta recargar la página.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const requestPosition = useCallback(
    (recenter: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setUserLocation(here);
          setLocationStatus("ok");
          if (recenter) flyTo(here, 14);
        },
        (geoError) => setLocationStatus(geoError.code === geoError.PERMISSION_DENIED ? "denied" : "unavailable"),
        GEO_OPTIONS,
      );
    },
    [flyTo],
  );

  // Como las apps de mapas, se pide la ubicación al abrir la vista.
  useEffect(() => {
    if (!window.isSecureContext || !("geolocation" in navigator)) return;
    requestPosition(true);
  }, [requestPosition]);

  const groups = useMemo(() => groupByPlace(events, (event) => event.venue), [events]);
  const selected = useMemo(() => groups.find((group) => group.key === selectedKey) ?? null, [groups, selectedKey]);

  const selectPlace = useCallback(
    (key: string | null) => {
      setSelectedKey(key);
      const group = key ? groups.find((candidate) => candidate.key === key) : undefined;
      if (group) flyTo(group, 16);
    },
    [groups, flyTo],
  );

  const goToMyLocation = () => {
    if (!window.isSecureContext) {
      setLocationStatus("insecure");
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }
    if (userLocation) flyTo(userLocation, 14);
    setLocationStatus((current) => (current === "ok" ? "ok" : "locating"));
    requestPosition(!userLocation);
  };

  const goToNearest = () => {
    if (!userLocation) return;
    const nearest = nearestGroup(groups, userLocation);
    if (nearest) selectPlace(nearest.key);
  };

  const summary = loading
    ? "Cargando eventos…"
    : `${plural(events.length, "evento", "eventos")} en ${plural(groups.length, "lugar", "lugares")}` +
      (total > events.length ? ` (primeros ${events.length} de ${total})` : "");

  const notice = error ?? (locationStatus === "ok" ? null : LOCATION_MESSAGES[locationStatus]);

  return (
    <div className="flex h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <Link href="/" className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">
          MOZAK
        </Link>
        <p className="min-w-0 flex-1 truncate text-center text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          {summary}
        </p>
        <Link href="/" className="shrink-0 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400">
          Ver lista
        </Link>
      </header>

      <main className="relative flex-1">
        <div className="absolute inset-0">
          <EventsMap groups={groups} selectedKey={selectedKey} userLocation={userLocation} focus={focus} onSelect={selectPlace} />
        </div>

        {notice && (
          <p
            role="status"
            className="absolute left-3 right-16 top-3 z-10 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-sm text-gray-700 shadow-md dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
          >
            {notice}
          </p>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3">
          <div className="flex flex-wrap justify-end gap-2 px-3">
            <button type="button" className={pillButton} onClick={goToNearest} disabled={!userLocation || groups.length === 0}>
              Lo más cercano
            </button>
            <button type="button" className={pillButton} onClick={goToMyLocation}>
              <span aria-hidden className="inline-block h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow" />
              Mi ubicación
            </button>
          </div>
          {selected ? (
            <PlaceCard group={selected} userLocation={userLocation} onClose={() => setSelectedKey(null)} />
          ) : (
            <p className="mx-3 mb-3 w-fit self-center rounded-full bg-gray-900/80 px-3 py-1 text-xs text-white">
              Toca un punto para ver sus eventos
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function PlaceCard({ group, userLocation, onClose }: { group: PlaceGroup<ApiEvent>; userLocation: LatLng | null; onClose: () => void }) {
  const first = group.items[0];
  const distance = userLocation ? formatDistance(distanceKm(userLocation, group)) : "";
  const directionsUrl = buildGoogleMapsUrl({
    latitude: group.latitude,
    longitude: group.longitude,
    address: first?.venue.address,
    commune: first?.venue.commune,
  });

  return (
    <section
      aria-label={`Eventos en ${group.name}`}
      className="pointer-events-auto max-h-[55dvh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900 sm:mx-auto sm:mb-4 sm:w-full sm:max-w-md sm:rounded-2xl sm:border"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">{group.name}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {[first?.venue.commune, plural(group.items.length, "evento", "eventos"), distance ? `a ${distance}` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          ✕
        </button>
      </div>

      <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
        {group.items.map((event) => (
          <li key={event.id} className="flex flex-col gap-1 py-3">
            <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
              {event.category.name}
            </span>
            <p className="font-semibold text-gray-900 dark:text-gray-50">{event.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatEventDate(event.startDate, event.endDate)} · {event.startTime}–{event.endTime} · {formatPrice(event.price, event.isFree)}
            </p>
            <Link href={`/eventos/${event.id}`} className="w-fit text-sm font-semibold text-green-700 hover:text-green-800 dark:text-green-400">
              Ver detalle →
            </Link>
          </li>
        ))}
      </ul>

      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Cómo llegar
        </a>
      )}
    </section>
  );
}
