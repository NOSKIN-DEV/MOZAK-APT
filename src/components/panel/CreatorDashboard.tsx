"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ApiManagedEvent } from "@/lib/server/serializers";
import { formatEventDate, formatPrice } from "@/lib/format";
import { ApiError, api, messageOf } from "./api-client";
import { ErrorBanner, StatusBadge, cardClasses, formatMoment, primaryButton, secondaryButton } from "./ui";

interface PolicySummary {
  version: string;
  prohibited: { id: string; label: string; description: string }[];
}

/** Panel del creador: sus eventos, el estado de cada uno y las acciones que le corresponden. */
export function CreatorDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<ApiManagedEvent[] | null>(null);
  const [policy, setPolicy] = useState<PolicySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handle = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/ingresar");
        return;
      }
      setError(messageOf(err));
    },
    [router],
  );

  const load = useCallback(async () => {
    try {
      const [list, catalog] = await Promise.all([
        api<{ data: ApiManagedEvent[] }>("/api/creator/events"),
        api<{ policy: PolicySummary }>("/api/creator/catalog"),
      ]);
      setEvents(list.data);
      setPolicy(catalog.policy);
    } catch (err) {
      handle(err);
    }
  }, [handle]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      setSubmittingId(null);
      setAccepted(false);
      await load();
    } catch (err) {
      handle(err);
    } finally {
      setBusyId(null);
    }
  };

  const submit = (id: string) =>
    run(id, () => api(`/api/creator/events/${id}/submit`, { method: "POST", body: { acceptsContentPolicy: accepted } }));
  const withdraw = (id: string) => run(id, () => api(`/api/creator/events/${id}/withdraw`, { method: "POST" }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Mis eventos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Prepara tu evento y envíalo a revisión. Solo un administrador puede aprobar su publicación.
          </p>
        </div>
        <Link href="/creador/eventos/nuevo" className={primaryButton}>
          + Nuevo evento
        </Link>
      </div>

      {policy && (
        <section className={`${cardClasses} text-sm text-gray-700 dark:text-gray-300`} aria-labelledby="policy-title">
          <h2 id="policy-title" className="font-semibold text-gray-900 dark:text-gray-50">
            Eventos que no se pueden publicar
          </h2>
          <ul className="mt-2 list-disc pl-5">
            {policy.prohibited.map((item) => (
              <li key={item.id}>
                <strong>{item.label}:</strong> {item.description}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Al enviar un evento a revisión declaras que lo cumple. Un administrador lo revisa antes de publicarlo.
          </p>
        </section>
      )}

      <ErrorBanner message={error} />

      {events === null && !error && <p className="py-10 text-center text-gray-500 dark:text-gray-400">Cargando tus eventos…</p>}
      {events?.length === 0 && (
        <p className="py-10 text-center text-gray-500 dark:text-gray-400">Todavía no has creado eventos. Empieza con «Nuevo evento».</p>
      )}

      <ul className="flex flex-col gap-4">
        {events?.map((event) => {
          const editable = event.status === "DRAFT" || event.status === "REJECTED";
          const busy = busyId === event.id;
          return (
            <li key={event.id} className={`${cardClasses} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-50">{event.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {event.category.name} · {formatEventDate(event.startDate, event.endDate)} · {event.venue.name}, {event.venue.commune} ·{" "}
                    {formatPrice(event.price, event.isFree)}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </div>

              {event.status === "REJECTED" && event.lastReview && (
                <div role="note" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <p className="font-medium">
                    {event.lastReview.decision === "UNPUBLISHED" ? "Un administrador retiró este evento" : "Un administrador rechazó este evento"}
                    {event.lastReview.reasonLabel ? `: ${event.lastReview.reasonLabel}` : ""}
                  </p>
                  {event.lastReview.note && <p className="mt-1">{event.lastReview.note}</p>}
                  <p className="mt-1 text-xs opacity-80">{formatMoment(event.lastReview.createdAt)} · Corrígelo y vuelve a enviarlo.</p>
                </div>
              )}
              {event.status === "PENDING_REVIEW" && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Enviado el {formatMoment(event.submittedAt)}. Esperando la decisión de un administrador.</p>
              )}

              {submittingId === event.id && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800">
                  <label className="flex items-start gap-2 text-gray-800 dark:text-gray-200">
                    <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                    <span>
                      Declaro que este evento <strong>no</strong> incluye desnudos ni actos sexuales, drogas ni tráfico de drogas, ni mercado negro o comercio ilícito.
                    </span>
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className={primaryButton} disabled={!accepted || busy} onClick={() => submit(event.id)}>
                      {busy ? "Enviando…" : "Enviar a revisión"}
                    </button>
                    <button type="button" className={secondaryButton} onClick={() => { setSubmittingId(null); setAccepted(false); }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {editable && (
                  <>
                    <Link href={`/creador/eventos/${event.id}`} className={secondaryButton}>
                      Editar
                    </Link>
                    <button type="button" className={primaryButton} disabled={busy} onClick={() => { setSubmittingId(event.id); setAccepted(false); }}>
                      Enviar a revisión
                    </button>
                  </>
                )}
                {event.status === "PUBLISHED" && (
                  <Link href={`/eventos/${event.id}`} className={secondaryButton}>
                    Ver en el sitio
                  </Link>
                )}
                {(event.status === "PENDING_REVIEW" || event.status === "PUBLISHED") && (
                  <button type="button" className={secondaryButton} disabled={busy} onClick={() => withdraw(event.id)}>
                    {event.status === "PUBLISHED" ? "Retirar publicación" : "Retirar de la revisión"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
