import type { ApiEvent } from "@/lib/api";
import { EventCard } from "./EventCard";

interface EventGridProps {
  events: ApiEvent[];
  isLoading: boolean;
  error: string | null;
  hasActiveFiltersOrSearch: boolean;
}

export function EventGrid({ events, isLoading, error, hasActiveFiltersOrSearch }: EventGridProps) {
  if (isLoading) {
    return <p className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">Cargando eventos…</p>;
  }

  if (error) {
    return <p className="px-4 py-16 text-center text-red-600 dark:text-red-400">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl" aria-hidden>
          🔎
        </p>
        <p className="mt-3 font-medium text-gray-900 dark:text-gray-100">No se encontraron eventos.</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {hasActiveFiltersOrSearch
            ? "Prueba con otra búsqueda o quita algunos filtros."
            : "Todavía no hay eventos cargados."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
