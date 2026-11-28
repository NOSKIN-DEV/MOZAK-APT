"use client";

import { useEffect, useRef } from "react";
import { SANTIAGO_CENTER, type LatLng, type PlaceGroup } from "@/lib/geo";
import * as L from "leaflet";
import { addBaseLayer, placePinIcon } from "./leaflet-setup";

/** Hacia dónde mover el mapa; `seq` cambia en cada pedido para repetir el mismo destino. */
export interface MapFocus extends LatLng {
  zoom: number;
  seq: number;
}

export interface EventsMapProps {
  groups: readonly PlaceGroup<unknown>[];
  selectedKey: string | null;
  userLocation: LatLng | null;
  focus: MapFocus | null;
  /** Lugar tocado, o null al tocar una zona vacía del mapa. */
  onSelect: (key: string | null) => void;
}

/**
 * Mapa de eventos (Etapa 16): un pin por lugar con el número de eventos, el punto
 * azul del usuario y movimientos animados hacia el lugar o la ubicación pedida.
 * Se carga solo en el navegador (next/dynamic con ssr: false), porque Leaflet
 * necesita `window`.
 */
export default function EventsMap({ groups, selectedKey, userLocation, focus, onSelect }: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const fittedRef = useRef(false);
  const focusedRef = useRef(false);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Crear el mapa una sola vez.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = L.map(container, { zoomControl: false }).setView([SANTIAGO_CENTER.latitude, SANTIAGO_CENTER.longitude], 12);
    L.control.zoom({ position: "topright" }).addTo(map);
    addBaseLayer(map);
    markersRef.current = L.layerGroup().addTo(map);
    map.on("click", () => onSelectRef.current(null));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Pines: se redibujan cuando cambian los lugares o el seleccionado (son pocos).
  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const group of groups) {
      const selected = group.key === selectedKey;
      const count = group.items.length;
      L.marker([group.latitude, group.longitude], {
        icon: placePinIcon(count, selected),
        title: group.name,
        alt: `${group.name}: ${count} ${count === 1 ? "evento" : "eventos"}`,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
        keyboard: true,
      })
        .on("click", () => onSelectRef.current(group.key))
        .addTo(layer);
    }
  }, [groups, selectedKey]);

  // Primera carga sin ubicación del usuario: encuadrar todos los lugares.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || focusedRef.current || groups.length === 0) return;
    const bounds = L.latLngBounds(groups.map((group) => [group.latitude, group.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    fittedRef.current = true;
  }, [groups]);

  // Punto azul del usuario.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    const position: [number, number] = [userLocation.latitude, userLocation.longitude];
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(position);
    } else {
      userMarkerRef.current = L.circleMarker(position, {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2563eb",
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    }
  }, [userLocation]);

  // Mover el mapa cuando se pide (mi ubicación, lo más cercano, lugar elegido).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    focusedRef.current = true;
    map.flyTo([focus.latitude, focus.longitude], focus.zoom, { duration: 0.6 });
  }, [focus]);

  // "relative z-0": las capas de Leaflet (z-index 400 a 1000) quedan dentro del mapa y no tapan los paneles de la página.
  return <div ref={containerRef} className="relative z-0 h-full w-full" role="application" aria-label="Mapa de eventos" />;
}
