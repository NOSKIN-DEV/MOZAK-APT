import Link from "next/link";
import type { ApiEvent } from "@/lib/api";
import { formatEventDate, formatPrice } from "@/lib/format";

interface EventCardProps {
  event: ApiEvent;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/eventos/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-video w-full overflow-hidden bg-gray-100">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- imágenes externas (picsum), sin optimización necesaria en el prototipo
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden>
            🗓️
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          {event.category.name}
        </span>
        <h3 className="line-clamp-2 font-semibold text-gray-900">{event.title}</h3>
        <p className="text-sm text-gray-600">{formatEventDate(event.startDate, event.endDate)}</p>
        <p className="text-sm text-gray-600">
          {event.venue.name} · {event.venue.commune}
        </p>
        <p className="mt-auto pt-2 text-sm font-semibold text-gray-900">
          {formatPrice(event.price, event.isFree)}
        </p>
      </div>
    </Link>
  );
}
