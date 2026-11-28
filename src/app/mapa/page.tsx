import type { Metadata } from "next";
import { MapPage } from "@/components/map/MapPage";

export const metadata: Metadata = {
  title: "Mapa de eventos | MOZAK",
  description: "Eventos cercanos en el mapa: toca un punto para ver qué hay y cómo llegar.",
};

export default function MapaPage() {
  return <MapPage />;
}
