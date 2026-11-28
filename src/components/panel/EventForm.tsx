"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { ApiManagedEvent } from "@/lib/server/serializers";
import type { Category, Venue } from "@/types";
import { ApiError, api, messageOf, type ApiIssue } from "./api-client";
import { ErrorBanner, Field, cardClasses, inputClasses, primaryButton, secondaryButton } from "./ui";

interface FormState {
  title: string;
  description: string;
  categoryId: string;
  venueMode: "existing" | "new";
  venueId: string;
  venueName: string;
  venueAddress: string;
  venueCommune: string;
  venueCity: string;
  venueLatitude: string;
  venueLongitude: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isFree: boolean;
  price: string;
  imageUrl: string;
  posterImageUrl: string;
  videoUrl: string;
  sourceUrl: string;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  categoryId: "",
  venueMode: "existing",
  venueId: "",
  venueName: "",
  venueAddress: "",
  venueCommune: "",
  venueCity: "Santiago",
  venueLatitude: "",
  venueLongitude: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  isFree: true,
  price: "",
  imageUrl: "",
  posterImageUrl: "",
  videoUrl: "",
  sourceUrl: "",
};

const toNumber = (value: string): number => (value.trim() === "" ? Number.NaN : Number(value.replace(",", ".")));

function toPayload(form: FormState): Record<string, unknown> {
  const venue =
    form.venueMode === "existing"
      ? { venueId: form.venueId }
      : {
          newVenue: {
            name: form.venueName,
            address: form.venueAddress,
            commune: form.venueCommune,
            city: form.venueCity,
            latitude: toNumber(form.venueLatitude),
            longitude: toNumber(form.venueLongitude),
          },
        };
  return {
    title: form.title,
    description: form.description,
    categoryId: form.categoryId,
    ...venue,
    startDate: form.startDate,
    endDate: form.endDate,
    startTime: form.startTime,
    endTime: form.endTime,
    isFree: form.isFree,
    price: form.isFree ? 0 : toNumber(form.price),
    imageUrl: form.imageUrl,
    posterImageUrl: form.posterImageUrl,
    videoUrl: form.videoUrl,
    sourceUrl: form.sourceUrl,
  };
}

function fromEvent(event: ApiManagedEvent): FormState {
  return {
    ...emptyForm,
    title: event.title,
    description: event.description,
    categoryId: event.category.id,
    venueId: event.venue.id,
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    isFree: event.isFree,
    price: event.isFree ? "" : String(event.price),
    imageUrl: event.imageUrl ?? "",
    posterImageUrl: event.posterImageUrl ?? "",
    videoUrl: event.videoUrl ?? "",
    sourceUrl: event.sourceUrl,
  };
}

/** Los errores de la API se muestran junto al campo que corresponde (path "newVenue.name" → "venueName"). */
const PATH_TO_FIELD: Record<string, string> = {
  "newVenue.name": "venueName",
  "newVenue.address": "venueAddress",
  "newVenue.commune": "venueCommune",
  "newVenue.city": "venueCity",
  "newVenue.latitude": "venueLatitude",
  "newVenue.longitude": "venueLongitude",
};

function indexIssues(issues: ApiIssue[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of issues) {
    const key = PATH_TO_FIELD[issue.path] ?? issue.path;
    result[key] ??= issue.message;
  }
  return result;
}

interface EventFormProps {
  /** null = evento nuevo. */
  eventId: string | null;
}

/** Formulario para crear o corregir un borrador. El envío a revisión se hace desde el panel. */
export function EventForm({ eventId }: EventFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await api<{ data: { categories: Category[]; venues: Venue[] } }>("/api/creator/catalog");
        if (cancelled) return;
        setCategories(catalog.data.categories);
        setVenues(catalog.data.venues);
        if (eventId) {
          const current = await api<{ data: ApiManagedEvent }>(`/api/creator/events/${eventId}`);
          if (cancelled) return;
          setForm(fromEvent(current.data));
          setLocked(current.data.status !== "DRAFT" && current.data.status !== "REJECTED");
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/ingresar");
          return;
        }
        if (!cancelled) setError(messageOf(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, router]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      if (eventId) {
        await api(`/api/creator/events/${eventId}`, { method: "PUT", body: toPayload(form) });
      } else {
        await api("/api/creator/events", { method: "POST", body: toPayload(form) });
      }
      router.push("/creador");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/ingresar");
        return;
      }
      setError(messageOf(err));
      if (err instanceof ApiError) setFieldErrors(indexIssues(err.issues));
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="py-16 text-center text-gray-500 dark:text-gray-400">Cargando…</p>;
  }

  const disabled = busy || locked;
  const err = fieldErrors;

  return (
    <form onSubmit={save} className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{eventId ? "Editar evento" : "Nuevo evento"}</h1>
        <Link href="/creador" className="text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400">
          ← Volver a mis eventos
        </Link>
      </div>

      {locked && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Este evento está publicado o en revisión y no se puede editar. Retíralo desde «Mis eventos» para corregirlo; al volver a enviarlo, un administrador lo revisará de nuevo.
        </p>
      )}
      <ErrorBanner message={error} />

      <fieldset disabled={disabled} className={`${cardClasses} flex flex-col gap-4`}>
        <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Datos del evento</legend>
        <Field label="Título" htmlFor="ev-title" error={err.title}>
          <input id="ev-title" className={inputClasses} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} required />
        </Field>
        <Field label="Descripción" htmlFor="ev-description" error={err.description} hint="Qué se hará, para quién es y cualquier dato útil (entre 20 y 2000 caracteres).">
          <textarea id="ev-description" className={inputClasses} rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} required />
        </Field>
        <Field label="Categoría" htmlFor="ev-category" error={err.categoryId}>
          <select id="ev-category" className={inputClasses} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
            <option value="">Elige una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset disabled={disabled} className={`${cardClasses} flex flex-col gap-4`}>
        <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Fecha y hora</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de inicio" htmlFor="ev-start-date" error={err.startDate}>
            <input id="ev-start-date" type="date" className={inputClasses} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
          </Field>
          <Field label="Fecha de término" htmlFor="ev-end-date" error={err.endDate}>
            <input id="ev-end-date" type="date" className={inputClasses} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
          </Field>
          <Field label="Hora de inicio" htmlFor="ev-start-time" error={err.startTime}>
            <input id="ev-start-time" type="time" className={inputClasses} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required />
          </Field>
          <Field label="Hora de término" htmlFor="ev-end-time" error={err.endTime}>
            <input id="ev-end-time" type="time" className={inputClasses} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} required />
          </Field>
        </div>
      </fieldset>

      <fieldset disabled={disabled} className={`${cardClasses} flex flex-col gap-4`}>
        <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Lugar</legend>
        <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-200">
          <label className="flex items-center gap-2">
            <input type="radio" name="venue-mode" checked={form.venueMode === "existing"} onChange={() => set("venueMode", "existing")} />
            Recinto existente
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="venue-mode" checked={form.venueMode === "new"} onChange={() => set("venueMode", "new")} />
            Recinto nuevo
          </label>
        </div>
        {form.venueMode === "existing" ? (
          <Field label="Recinto" htmlFor="ev-venue" error={err.venueId}>
            <select id="ev-venue" className={inputClasses} value={form.venueId} onChange={(e) => set("venueId", e.target.value)} required>
              <option value="">Elige un recinto</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} · {venue.commune}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del recinto" htmlFor="ev-vname" error={err.venueName}>
              <input id="ev-vname" className={inputClasses} value={form.venueName} onChange={(e) => set("venueName", e.target.value)} required />
            </Field>
            <Field label="Dirección" htmlFor="ev-vaddress" error={err.venueAddress}>
              <input id="ev-vaddress" className={inputClasses} value={form.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} required />
            </Field>
            <Field label="Comuna" htmlFor="ev-vcommune" error={err.venueCommune}>
              <input id="ev-vcommune" className={inputClasses} value={form.venueCommune} onChange={(e) => set("venueCommune", e.target.value)} required />
            </Field>
            <Field label="Ciudad" htmlFor="ev-vcity" error={err.venueCity}>
              <input id="ev-vcity" className={inputClasses} value={form.venueCity} onChange={(e) => set("venueCity", e.target.value)} required />
            </Field>
            <Field label="Latitud" htmlFor="ev-vlat" error={err.venueLatitude} hint="En Google Maps: clic derecho sobre el lugar y copia las coordenadas (ej. -33.4489).">
              <input id="ev-vlat" inputMode="decimal" className={inputClasses} value={form.venueLatitude} onChange={(e) => set("venueLatitude", e.target.value)} required />
            </Field>
            <Field label="Longitud" htmlFor="ev-vlng" error={err.venueLongitude} hint="Ej. -70.6693.">
              <input id="ev-vlng" inputMode="decimal" className={inputClasses} value={form.venueLongitude} onChange={(e) => set("venueLongitude", e.target.value)} required />
            </Field>
          </div>
        )}
      </fieldset>

      <fieldset disabled={disabled} className={`${cardClasses} flex flex-col gap-4`}>
        <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-50">Precio y enlaces</legend>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input type="checkbox" checked={form.isFree} onChange={(e) => set("isFree", e.target.checked)} />
          El evento es gratuito
        </label>
        {!form.isFree && (
          <Field label="Precio (pesos chilenos)" htmlFor="ev-price" error={err.price}>
            <input id="ev-price" inputMode="numeric" className={inputClasses} value={form.price} onChange={(e) => set("price", e.target.value)} required />
          </Field>
        )}
        <Field label="Enlace oficial del evento" htmlFor="ev-source" error={err.sourceUrl} hint="Página donde se informa o se compran las entradas (http:// o https://).">
          <input id="ev-source" type="url" className={inputClasses} value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} required />
        </Field>
        <Field label="Imagen (opcional)" htmlFor="ev-image" error={err.imageUrl} hint="Dirección de una imagen ya publicada en internet.">
          <input id="ev-image" type="url" className={inputClasses} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>
        <Field label="Afiche (opcional)" htmlFor="ev-poster" error={err.posterImageUrl}>
          <input id="ev-poster" type="url" className={inputClasses} value={form.posterImageUrl} onChange={(e) => set("posterImageUrl", e.target.value)} />
        </Field>
        <Field label="Video promocional (opcional)" htmlFor="ev-video" error={err.videoUrl}>
          <input id="ev-video" type="url" className={inputClasses} value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
        </Field>
      </fieldset>

      <div className="flex gap-3">
        <button type="submit" disabled={disabled} className={primaryButton}>
          {busy ? "Guardando…" : "Guardar borrador"}
        </button>
        <Link href="/creador" className={secondaryButton}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
