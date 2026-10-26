"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { FiltersBar, initialFiltersState, type FiltersState } from "@/components/FiltersBar";
import { EventGrid } from "@/components/EventGrid";
import { Pagination } from "@/components/Pagination";
import { ResultsToolbar } from "@/components/ResultsToolbar";
import { buildEventsQuery } from "@/lib/api/build-events-query";
import type { ApiEvent, ApiEventsMeta } from "@/lib/api";
import type { EventSort } from "@/lib/schemas";
import type { Category } from "@/types";

// Eventos por página en el listado (la API admite hasta 100; 12 llena bien la grilla de 2, 3 y 4 columnas).
const PAGE_SIZE = 12;

function HomePageContent() {
  // Permite llegar desde otra página con una búsqueda ya aplicada,
  // ej. /?search=teatro (ver src/app/eventos/[id]/page.tsx).
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<FiltersState>(initialFiltersState);
  const [sort, setSort] = useState<EventSort>("date_asc");
  const [pageNumber, setPageNumber] = useState(1);

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [meta, setMeta] = useState<ApiEventsMeta | null>(null);
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
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
      setPageNumber(1); // una búsqueda nueva siempre vuelve a la primera página
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Consulta a la API cada vez que cambian la búsqueda (ya con debounce),
  // los filtros, el orden o la página. Todos los criterios se combinan con AND
  // en el backend (ver src/lib/repositories/).
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const query = buildEventsQuery({
      search: debouncedSearch,
      category: filters.category,
      commune: filters.commune,
      date: filters.date,
      priceFilter: filters.priceFilter,
      sort,
      page: pageNumber,
      limit: PAGE_SIZE,
    });

    fetch(`/api/events${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los eventos");
        return res.json();
      })
      .then((body) => {
        // Si la página pedida quedó fuera de rango (los datos cambiaron entre
        // una consulta y otra) pero sí hay resultados, se vuelve a la primera.
        if (body.data.length === 0 && body.meta.total > 0 && pageNumber > 1) {
          setPageNumber(1);
          return;
        }
        setEvents(body.data);
        setMeta(body.meta);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Ocurrió un error al cargar los eventos. Intenta nuevamente.");
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedSearch, filters, sort, pageNumber]);

  const handleFiltersChange = (next: FiltersState) => {
    setFilters(next);
    setPageNumber(1);
  };

  const handleSortChange = (next: EventSort) => {
    setSort(next);
    setPageNumber(1);
  };

  const handlePageChange = (next: number) => {
    setPageNumber(next);
    document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClearFilters = () => {
    setFilters(initialFiltersState);
    setSearch("");
    setPageNumber(1);
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
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
      />
      {!error && meta !== null && (
        <ResultsToolbar
          total={meta.total}
          page={meta.page}
          pageSize={PAGE_SIZE}
          shown={events.length}
          sort={sort}
          onSortChange={handleSortChange}
        />
      )}
      <EventGrid
        events={events}
        isLoading={isLoading}
        error={error}
        hasActiveFiltersOrSearch={hasActiveFiltersOrSearch}
      />
      {!isLoading && !error && events.length > 0 && meta !== null && (
        <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={handlePageChange} />
      )}
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
