"use client";

import { formatResultsSummary } from "@/lib/format";
import type { EventSort } from "@/lib/schemas";

interface ResultsToolbarProps {
  total: number;
  page: number;
  pageSize: number;
  shown: number;
  sort: EventSort;
  onSortChange: (sort: EventSort) => void;
}

const sortOptions: ReadonlyArray<{ value: EventSort; label: string }> = [
  { value: "date_asc", label: "Fecha: más próximos primero" },
  { value: "date_desc", label: "Fecha: más lejanos primero" },
];

/** Resumen "Mostrando 1–12 de 24 eventos" + selector de orden (MTC_00110). */
export function ResultsToolbar({ total, page, pageSize, shown, sort, onSortChange }: ResultsToolbarProps) {
  return (
    <div
      id="resultados"
      className="mx-auto flex max-w-6xl scroll-mt-4 flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
        {formatResultsSummary(total, page, pageSize, shown)}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="sort-events" className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Ordenar por
        </label>
        <select
          id="sort-events"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as EventSort)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
