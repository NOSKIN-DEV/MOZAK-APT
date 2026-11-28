"use client";

import dynamic from "next/dynamic";

/**
 * La vista de mapa usa `window` (ubicación del usuario y Leaflet), así que se
 * carga solo en el navegador. next/dynamic con { ssr: false } solo se permite
 * dentro de un componente cliente: por eso existe este envoltorio.
 */
const MapExplorer = dynamic(() => import("./MapExplorer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-gray-500 dark:text-gray-400">Cargando mapa…</div>
  ),
});

export function MapPage() {
  return <MapExplorer />;
}
