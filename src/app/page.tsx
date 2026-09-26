"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { FiltersBar, initialFiltersState, type FiltersState } from "@/components/FiltersBar";
import { EventGrid } from "@/components/EventGrid";
import type { ApiEvent } from "@/lib/api";
import type { Category } from "@/types";

function buildQueryString(search: string, filters: FiltersState): string {
  const params = new URLSearchParams();

  if (search.trim() !== "") params.set("search", search.trim());
  if (filters.category !== "") params.set("category", filters.category);
  if (filters.commune !== "") params.set("commune", filters.commune);
  if (filters.date !== "") {
    // Un evento "ocurre" en la fecha elegida si esa fecha cae dentro de
    // su rango [startDate, endDate], por eso se manda como dateFrom=dateTo.
    params.set("dateFrom", filters.date);
    params.set("dateTo", filters.date);
  }
  if (filters.priceFilter === "free") params.set("isFree", "true");
  if (filters.priceFilter === "paid") params.set("isFree", "false");

  const query = params.toString();
  return query ? `?${query}` : "";
}

function HomePageContent() {
  // Permite llegar desde otra página con una búsqueda ya aplicada,
  // ej. /?search=teatro (ver src/app/eventos/[id]/page.tsx).
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
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

  // Debounce del texto de búsqueda: espera 300ms sin que el usuario
  // escriba antes de disparar la consulta, para no golpear la API en
  // cada tecla.
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Consulta a la API cada vez que cambian la búsqueda (ya con debounce)
  // o los filtros. Todos los criterios se combinan con AND en el
  // backend (ver src/lib/repositories/mock-event-repository.ts).
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/events${buildQueryString(debouncedSearch, filters)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los eventos");
        return res.json();
      })
      .then((body) => setEvents(body.data))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Ocurrió un error al cargar los eventos. Intenta nuevamente.");
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedSearch, filters]);

  const handleClearFilters = () => {
    setFilters(initialFiltersState);
    setSearch("");
  };

  const hasActiveFiltersOrSearch =
    search.trim() !== "" ||
    filters.category !== "" ||
    filters.commune !== "" ||
    filters.date !== "" ||
    filters.priceFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
      {!isLoading && !error && (
        <p className="mx-auto max-w-6xl px-4 pb-2 text-sm text-gray-500 dark:text-gray-400">
          {events.length} {events.length === 1 ? "evento encontrado" : "eventos encontrados"}
        </p>
      )}
      <EventGrid
        events={events}
        isLoading={isLoading}
        error={error}
        hasActiveFiltersOrSearch={hasActiveFiltersOrSearch}
      />
    </div>
  );
}

// Next.js exige envolver en <Suspense> cualquier componente que use
// useSearchParams (se necesita para el flujo "buscar desde el detalle
// de un evento y volver al listado con esa búsqueda aplicada").
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}
