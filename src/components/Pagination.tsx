"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const buttonClasses =
  "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";

/** Navegación entre páginas del listado. Con una sola página no muestra botones. */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    // Sin paginación igual se deja el espacio inferior de la página.
    return <div className="pb-8" aria-hidden />;
  }

  return (
    <nav aria-label="Paginación de eventos" className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 pb-16">
      <button type="button" className={buttonClasses} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ← Anterior
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-300" aria-current="page">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        className={buttonClasses}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
}
