"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ApiManagedEvent } from "@/lib/server/serializers";
import { formatEventDate } from "@/lib/format";
import { EVENT_STATUSES, type EventStatus } from "@/types";
import { ApiError, api, messageOf } from "./api-client";
import { ReviewPanel, type ReviewPolicy } from "./ReviewPanel";
import { UsersPanel } from "./UsersPanel";
import { ErrorBanner, StatusBadge, cardClasses, formatMoment, inputClasses, primaryButton, secondaryButton, statusLabel } from "./ui";

type Tab = "pending" | "all" | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "pending", label: "Pendientes de revisión" },
  { id: "all", label: "Todos los eventos" },
  { id: "users", label: "Creadores" },
];

/** Panel del administrador: cola de revisión, todos los eventos y cuentas de creadores. */
export function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "">("");
  const [events, setEvents] = useState<ApiManagedEvent[] | null>(null);
  const [policy, setPolicy] = useState<ReviewPolicy | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unauthenticated = useCallback(() => router.replace("/ingresar"), [router]);

  const load = useCallback(async () => {
    if (tab === "users") return;
    const status = tab === "pending" ? "PENDING_REVIEW" : statusFilter;
    try {
      const result = await api<{ data: ApiManagedEvent[]; policy: ReviewPolicy }>(`/api/admin/events${status ? `?status=${status}` : ""}`);
      setEvents(result.data);
      setPolicy(result.policy);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) unauthenticated();
      else setError(messageOf(err));
    }
  }, [tab, statusFilter, unauthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  // Al cambiar de pestaña o de filtro se vacía la lista (muestra «Cargando…») y se cierra la revisión abierta.
  const changeTab = (next: Tab) => {
    setEvents(null);
    setSelected(null);
    setTab(next);
  };
  const changeStatus = (next: EventStatus | "") => {
    setEvents(null);
    setSelected(null);
    setStatusFilter(next);
  };

  const afterDecision = () => {
    setSelected(null);
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Administración</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Solo tú puedes aprobar la publicación de un evento, y solo si está dentro de la norma.
        </p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => changeTab(item.id)}
            className={tab === item.id ? primaryButton : secondaryButton}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <UsersPanel onUnauthenticated={unauthenticated} />
      ) : (
        <>
          {tab === "all" && (
            <div className="flex w-full max-w-xs flex-col gap-1">
              <label htmlFor="status-filter" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Estado
              </label>
              <select id="status-filter" className={inputClasses} value={statusFilter} onChange={(e) => changeStatus(e.target.value as EventStatus | "")}>
                <option value="">Todos</option>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ErrorBanner message={error} />
          {events === null && !error && <p className="py-10 text-center text-gray-500 dark:text-gray-400">Cargando eventos…</p>}
          {events?.length === 0 && (
            <p className="py-10 text-center text-gray-500 dark:text-gray-400">
              {tab === "pending" ? "No hay eventos esperando revisión." : "No hay eventos con ese estado."}
            </p>
          )}

          {selected && policy && (
            <ReviewPanel key={selected} eventId={selected} policy={policy} onChanged={afterDecision} onClose={() => setSelected(null)} onUnauthenticated={unauthenticated} />
          )}

          <ul className="flex flex-col gap-3">
            {events?.map((event) => (
              <li key={event.id} className={`${cardClasses} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{event.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {event.createdBy?.name ?? "Demostración"} · {event.category.name} · {formatEventDate(event.startDate, event.endDate)}
                    {event.status === "PENDING_REVIEW" ? ` · Enviado: ${formatMoment(event.submittedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={event.status} />
                  <button type="button" className={event.status === "PENDING_REVIEW" ? primaryButton : secondaryButton} onClick={() => setSelected(event.id)}>
                    {event.status === "PENDING_REVIEW" ? "Revisar" : "Ver"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
