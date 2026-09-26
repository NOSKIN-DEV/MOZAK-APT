"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { FiltersBar, initialFiltersState, type FiltersState } from "@/components/FiltersBar";
import { EventGrid } from "@/components/EventGrid";
import type { ApiEvent } from "@/lib/api";
import type { Category } from "@/types";

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FiltersState>(initialFiltersState);

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [communes, setCommunes] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial de categorías y comunas para llenar los <select> de filtros.
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((body) => setCategories(body.data))
      .catch(() => setCategories([]));

    fetch("/api/communes")
      .then((res) => res.json())
      .then((body) => setCommunes(body.data))
      .catch(() => setCommunes([]));
  }, []);

  // Carga de eventos desde la API interna. Todavía sin conectar los
  // filtros/búsqueda al fetch (eso se hace en la Etapa 5): por ahora
  // siempre trae el listado completo.
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch("/api/events")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los eventos");
        return res.json();
      })
      .then((body) => setEvents(body.data))
      .catch(() => setError("Ocurrió un error al cargar los eventos. Intenta nuevamente."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleClearFilters = () => setFilters(initialFiltersState);

  // Se usará en la Etapa 5 para no volver a crear la función en cada render.
  const eventsToShow = useMemo(() => events, [events]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchValue={search} onSearchChange={setSearch} />
      <Hero>
        <SearchBar value={search} onChange={setSearch} size="lg" />
      </Hero>
      <FiltersBar
        categories={categories}
        communes={communes}
        filters={filters}
        onChange={setFilters}
        onClear={handleClearFilters}
      />
      <EventGrid events={eventsToShow} isLoading={isLoading} error={error} />
    </div>
  );
}
