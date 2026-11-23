"use client";

import { useEffect, useState } from "react";
import type { ApiManagedEvent, ApiReview } from "@/lib/server/serializers";
import { formatEventDate, formatPrice } from "@/lib/format";
import { ApiError, api, messageOf } from "./api-client";
import { ErrorBanner, Field, StatusBadge, cardClasses, dangerButton, formatMoment, inputClasses, primaryButton, secondaryButton } from "./ui";

export interface ReviewPolicy {
  checklist: { key: string; category: string; label: string }[];
  rejectionReasons: { id: string; label: string }[];
}

interface Detail {
  data: ApiManagedEvent;
  flags: { category: string; term: string; label: string }[];
  reviews: ApiReview[];
}

interface ReviewPanelProps {
  eventId: string;
  policy: ReviewPolicy;
  onChanged: () => void;
  onClose: () => void;
  onUnauthenticated: () => void;
}

const DECISION_LABELS: Record<string, string> = {
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  UNPUBLISHED: "Retirado de la publicación",
};

function ExternalLink({ href }: { href: string }) {
  // Se muestra la dirección completa: el administrador debe ver a dónde apunta el enlace antes de abrirlo.
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-green-700 underline dark:text-green-400">
      {href}
    </a>
  );
}

/**
 * Revisión de un evento por un administrador: datos, alertas automáticas (solo
 * orientativas), lista de condiciones de la norma y decisión. La aprobación
 * exige las tres condiciones confirmadas; el servidor lo vuelve a comprobar.
 */
export function ReviewPanel({ eventId, policy, onChanged, onClose, onUnauthenticated }: ReviewPanelProps) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [approveNote, setApproveNote] = useState("");
  const [reason, setReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    // El componente se monta de nuevo por cada evento (ver `key` en AdminDashboard): el estado parte limpio.
    let cancelled = false;
    api<Detail>(`/api/admin/events/${eventId}`)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) onUnauthenticated();
        else if (!cancelled) setError(messageOf(err));
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, onUnauthenticated]);

  const decide = async (action: "approve" | "reject" | "unpublish", body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/events/${eventId}/${action}`, { method: "POST", body });
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onUnauthenticated();
      else setError(messageOf(err));
      setBusy(false);
    }
  };

  if (!detail) {
    return (
      <div className={cardClasses}>
        <ErrorBanner message={error} />
        {!error && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando evento…</p>}
        <button type="button" className={`${secondaryButton} mt-3`} onClick={onClose}>
          Cerrar
        </button>
      </div>
    );
  }

  const { data: event, flags, reviews } = detail;
  const allChecked = policy.checklist.every((item) => checks[item.key] === true);
  const hasFlags = flags.length > 0;
  const noteOk = !hasFlags || approveNote.trim().length >= 10;
  const rejectOk = reason !== "" && rejectNote.trim().length >= 10;
  const reasonLabel = (id: string) => policy.rejectionReasons.find((r) => r.id === id)?.label ?? id;

  return (
    <section className={`${cardClasses} flex flex-col gap-5`} aria-label={`Revisión de ${event.title}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{event.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {event.createdBy ? `${event.createdBy.name} (${event.createdBy.email})` : "Evento de demostración (sin creador)"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={event.status} />
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-gray-500">Categoría</dt><dd>{event.category.name}</dd></div>
        <div><dt className="text-xs text-gray-500">Fecha</dt><dd>{formatEventDate(event.startDate, event.endDate)} · {event.startTime}–{event.endTime}</dd></div>
        <div><dt className="text-xs text-gray-500">Lugar</dt><dd>{event.venue.name}, {event.venue.address}, {event.venue.commune}</dd></div>
        <div><dt className="text-xs text-gray-500">Precio</dt><dd>{formatPrice(event.price, event.isFree)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Enlace oficial</dt><dd><ExternalLink href={event.sourceUrl} /></dd></div>
        {event.imageUrl && <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Imagen</dt><dd><ExternalLink href={event.imageUrl} /></dd></div>}
        {event.posterImageUrl && <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Afiche</dt><dd><ExternalLink href={event.posterImageUrl} /></dd></div>}
        {event.videoUrl && <div className="sm:col-span-2"><dt className="text-xs text-gray-500">Video</dt><dd><ExternalLink href={event.videoUrl} /></dd></div>}
        <div><dt className="text-xs text-gray-500">Enviado a revisión</dt><dd>{formatMoment(event.submittedAt)}</dd></div>
        <div><dt className="text-xs text-gray-500">Declaración de política del creador</dt><dd>{event.contentPolicyAcceptedAt ? formatMoment(event.contentPolicyAcceptedAt) : "—"}</dd></div>
      </dl>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">Descripción</h3>
        <p className="mt-1 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">{event.description}</p>
      </div>

      <div
        role="status"
        className={`rounded-lg border p-3 text-sm ${hasFlags ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
      >
        <p className="font-medium">Alertas automáticas (orientativas)</p>
        {hasFlags ? (
          <ul className="mt-1 list-disc pl-5">
            {flags.map((flag) => (
              <li key={`${flag.category}:${flag.term}`}>
                {flag.label}: «{flag.term}»
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">No se encontraron palabras de alerta. Esto no reemplaza tu revisión: confirma tú mismo las condiciones.</p>
        )}
      </div>

      {event.status === "PENDING_REVIEW" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <fieldset className="flex flex-col gap-3 rounded-lg border border-green-200 p-4 dark:border-green-900" disabled={busy}>
            <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Aprobar y publicar</legend>
            <p className="text-xs text-gray-600 dark:text-gray-400">Solo se publica si el evento está dentro de la norma. Confirma las tres condiciones:</p>
            {policy.checklist.map((item) => (
              <label key={item.key} className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="checkbox" className="mt-1" checked={checks[item.key] === true} onChange={(e) => setChecks({ ...checks, [item.key]: e.target.checked })} />
                <span>{item.label}</span>
              </label>
            ))}
            <Field
              label={hasFlags ? "Nota (obligatoria: hay alertas automáticas)" : "Nota (opcional)"}
              htmlFor="approve-note"
              hint={hasFlags ? "Explica por qué el evento está dentro de la norma (mínimo 10 caracteres)." : undefined}
            >
              <textarea id="approve-note" rows={3} className={inputClasses} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} maxLength={500} />
            </Field>
            <button
              type="button"
              className={primaryButton}
              disabled={busy || !allChecked || !noteOk}
              onClick={() =>
                decide("approve", {
                  checklist: Object.fromEntries(policy.checklist.map((item) => [item.key, checks[item.key] === true])),
                  note: approveNote,
                })
              }
            >
              {busy ? "Guardando…" : "Aprobar y publicar"}
            </button>
          </fieldset>

          <fieldset className="flex flex-col gap-3 rounded-lg border border-red-200 p-4 dark:border-red-900" disabled={busy}>
            <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Rechazar</legend>
            <Field label="Motivo" htmlFor="reject-reason">
              <select id="reject-reason" className={inputClasses} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Elige un motivo</option>
                {policy.rejectionReasons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Explicación para el creador" htmlFor="reject-note" hint="Mínimo 10 caracteres. El creador la verá.">
              <textarea id="reject-note" rows={3} className={inputClasses} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={500} />
            </Field>
            <button type="button" className={dangerButton} disabled={busy || !rejectOk} onClick={() => decide("reject", { reason, note: rejectNote })}>
              Rechazar evento
            </button>
          </fieldset>
        </div>
      )}

      {event.status === "PUBLISHED" && (
        <fieldset className="flex flex-col gap-3 rounded-lg border border-red-200 p-4 dark:border-red-900" disabled={busy}>
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Retirar de la publicación</legend>
          <Field label="Motivo" htmlFor="unpublish-reason">
            <select id="unpublish-reason" className={inputClasses} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Elige un motivo</option>
              {policy.rejectionReasons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Explicación" htmlFor="unpublish-note" hint="Mínimo 10 caracteres. Queda registrada y el creador la verá.">
            <textarea id="unpublish-note" rows={3} className={inputClasses} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={500} />
          </Field>
          <button type="button" className={dangerButton} disabled={busy || !rejectOk} onClick={() => decide("unpublish", { reason, note: rejectNote })}>
            Retirar evento
          </button>
        </fieldset>
      )}

      {reviews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Historial de decisiones</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-gray-50">
                  {DECISION_LABELS[review.decision] ?? review.decision} · {review.reviewerName ?? "—"} · {formatMoment(review.createdAt)}
                </p>
                {review.reasonCategory && <p className="text-gray-700 dark:text-gray-300">Motivo: {reasonLabel(review.reasonCategory)}</p>}
                {review.note && <p className="text-gray-700 dark:text-gray-300">{review.note}</p>}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Condiciones de la norma confirmadas: {review.checklistConfirmed ? "sí" : "no aplica"} · Alertas automáticas:{" "}
                  {review.flaggedCategories && review.flaggedCategories.length > 0 ? review.flaggedCategories.map(reasonLabel).join(", ") : "ninguna"} · Política {review.policyVersion}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
