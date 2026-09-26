import type { ApiEvent } from "@/lib/api";
import { EventCard } from "./EventCard";

interface EventGridProps {
  events: ApiEvent[];
  isLoading: boolean;
  error: string | null;
}

export function EventGrid({ events, isLoading, error }: EventGridProps) {
  if (isLoading) {
    return <p className="px-4 py-16 text-center text-gray-500">Cargando eventos…</p>;
  }

  if (error) {
    return <p className="px-4 py-16 text-center text-red-600">{error}</p>;
  }

  if (events.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-gray-500">
        No se encontraron eventos con los filtros seleccionados.
      </p>
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
