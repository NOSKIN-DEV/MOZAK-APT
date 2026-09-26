"use client";

import type { Category } from "@/types";

export interface FiltersState {
  category: string;
  commune: string;
  date: string;
  priceFilter: "all" | "free" | "paid";
}

export const initialFiltersState: FiltersState = {
  category: "",
  commune: "",
  date: "",
  priceFilter: "all",
};

interface FiltersBarProps {
  categories: Category[];
  communes: string[];
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
  onClear: () => void;
}

const priceOptions = [
  { value: "all", label: "Todos" },
  { value: "free", label: "Gratis" },
  { value: "paid", label: "Pagado" },
] as const;

const selectClasses =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

export function FiltersBar({ categories, communes, filters, onChange, onClear }: FiltersBarProps) {
  const hasActiveFilters =
    filters.category !== "" || filters.commune !== "" || filters.date !== "" || filters.priceFilter !== "all";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-category" className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Categoría
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className={selectClasses}
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-commune" className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Comuna
        </label>
        <select
          id="filter-commune"
          value={filters.commune}
          onChange={(e) => onChange({ ...filters, commune: e.target.value })}
          className={selectClasses}
        >
          <option value="">Todas</option>
          {communes.map((commune) => (
            <option key={commune} value={commune}>
              {commune}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filter-date" className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Fecha
        </label>
        <input
          id="filter-date"
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
          className={selectClasses}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Precio</span>
        <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-700">
          {priceOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...filters, priceFilter: option.value })}
              className={
                filters.priceFilter === option.value
                  ? "bg-green-600 px-3 py-2 text-sm font-medium text-white"
                  : "bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-green-700 underline underline-offset-2 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 sm:ml-2"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
