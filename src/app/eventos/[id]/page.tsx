"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { EventLocationMap } from "@/components/EventLocationMap";
import { EventMediaHero, EventPosterBackdrop } from "@/components/EventMedia";
import type { ApiEvent } from "@/lib/api";
import { formatEventDate, formatPrice } from "@/lib/format";

type Status = "loading" | "found" | "not-found" | "error";

const detailLabelClasses = "text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";
const detailValueClasses = "text-gray-900 dark:text-gray-100";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [headerSearch, setHeaderSearch] = useState("");

  const handleSearchSubmit = (value: string) => {
    const query = value.trim();
    router.push(query ? `/?search=${encodeURIComponent(query)}` : "/");
  };

  useEffect(() => {
    if (!id) return;

    setStatus("loading");

    fetch(`/api/events/${id}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus("not-found");
          return null;
        }
        if (!res.ok) throw new Error("No se pudo cargar el evento");
        const body = await res.json();
        return body.data as ApiEvent;
      })
      .then((data) => {
        if (data) {
          setEvent(data);
          setStatus("found");
        }
      })
      .catch(() => setStatus("error"));
  }, [id]);

  useEffect(() => {
    if (event) document.title = `${event.title} | MOZAK`;
  }, [event]);

  return (
    <div className="relative isolate min-h-screen bg-gray-50 dark:bg-gray-950">
      {status === "found" && event && <EventPosterBackdrop posterImageUrl={event.posterImageUrl} />}
      <Header searchValue={headerSearch} onSearchChange={setHeaderSearch} onSearchSubmit={handleSearchSubmit} />

      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
        >
          ← Volver al listado
        </Link>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-16">
        {status === "loading" && (
          <p className="py-16 text-center text-gray-500 dark:text-gray-400">Cargando evento…</p>
        )}

        {status === "error" && (
          <p className="py-16 text-center text-red-600 dark:text-red-400">
            Ocurrió un error al cargar el evento. Intenta nuevamente.
          </p>
        )}

        {status === "not-found" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-4xl" aria-hidden>
              🔎
            </p>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Evento no encontrado</h1>
            <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
              El evento que buscas no existe o fue eliminado.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Volver al listado
            </Link>
          </div>
        )}

        {status === "found" && event && (
          <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <EventMediaHero
              title={event.title}
              imageUrl={event.imageUrl}
              posterImageUrl={event.posterImageUrl}
              videoUrl={event.videoUrl}
            />

            <div className="flex flex-col gap-6 p-5 sm:p-8">
              <div>
                <span className="w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  {event.category.name}
                </span>
                <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50 sm:text-3xl">
                  {event.title}
                </h1>
              </div>

              <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{event.description}</p>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className={detailLabelClasses}>Fecha</dt>
                  <dd className={detailValueClasses}>{formatEventDate(event.startDate, event.endDate)}</dd>
                </div>
                <div>
                  <dt className={detailLabelClasses}>Horario</dt>
                  <dd className={detailValueClasses}>
                    {event.startTime} – {event.endTime} hrs
                  </dd>
                </div>
                <div>
                  <dt className={detailLabelClasses}>Lugar</dt>
                  <dd className={detailValueClasses}>{event.venue.name}</dd>
                </div>
                <div>
                  <dt className={detailLabelClasses}>Dirección</dt>
                  <dd className={detailValueClasses}>
                    {event.venue.address}, {event.venue.commune}
                  </dd>
                </div>
                <div>
                  <dt className={detailLabelClasses}>Precio</dt>
                  <dd className={detailValueClasses}>{formatPrice(event.price, event.isFree)}</dd>
                </div>
                <div>
                  <dt className={detailLabelClasses}>Fuente</dt>
                  <dd className={detailValueClasses}>{event.source.name}</dd>
                </div>
              </dl>

              <div>
                <h2 className={`${detailLabelClasses} mb-2`}>Ubicación</h2>
                <EventLocationMap
                  latitude={event.venue.latitude}
                  longitude={event.venue.longitude}
                  label={event.venue.name}
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row">
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
                >
                  Ver sitio oficial
                </a>
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 sm:w-auto"
                >
                  Volver al listado
                </Link>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
