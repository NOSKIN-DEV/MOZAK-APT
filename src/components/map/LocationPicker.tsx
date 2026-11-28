"use client";

import { useEffect, useRef } from "react";
import { SANTIAGO_CENTER, type LatLng } from "@/lib/geo";
import * as L from "leaflet";
import { addBaseLayer, pickedPinIcon } from "./leaflet-setup";

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  disabled?: boolean;
}

/**
 * Selector de ubicación del formulario del creador (Etapa 16): se toca el mapa
 * para marcar el lugar y el marcador se puede arrastrar para ajustarlo. Reemplaza
 * los campos de latitud y longitud escritos a mano. Se carga solo en el navegador
 * (next/dynamic con ssr: false).
 */
export default function LocationPicker({ value, onChange, disabled = false }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const initialValueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
  }, [onChange, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const start = initialValueRef.current ?? SANTIAGO_CENTER;
    const map = L.map(container).setView([start.latitude, start.longitude], initialValueRef.current ? 16 : 12);
    addBaseLayer(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      if (disabledRef.current) return;
      // wrap(): si el mapa dio la vuelta al mundo, deja la longitud entre -180 y 180.
      const point = event.latlng.wrap();
      onChangeRef.current({ latitude: point.lat, longitude: point.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position: [number, number] = [value.latitude, value.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      const marker = L.marker(position, { icon: pickedPinIcon(), draggable: true, keyboard: true, title: "Lugar del evento" });
      marker.on("dragend", () => {
        const point = marker.getLatLng().wrap();
        onChangeRef.current({ latitude: point.lat, longitude: point.lng });
      });
      markerRef.current = marker.addTo(map);
    }
    if (!map.getBounds().contains(position)) {
      map.setView(position, Math.max(map.getZoom(), 16));
    }
  }, [value]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker?.dragging) return;
    if (disabled) marker.dragging.disable();
    else marker.dragging.enable();
  }, [disabled, value]);

  return (
    <div
      ref={containerRef}
      className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700"
      role="application"
      aria-label="Mapa para marcar el lugar del evento"
    />
  );
}
