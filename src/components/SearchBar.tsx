"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "lg";
  /** Se dispara al enviar el formulario (tecla Enter). Opcional: en el listado no hace falta, porque ya filtra mientras se escribe. */
  onSubmit?: (value: string) => void;
}

/**
 * Input de búsqueda controlado. El estado vive en el componente padre.
 * En el listado (HomePage) el valor se usa para filtrar en vivo con
 * debounce; en otras páginas (ej. detalle de evento) onSubmit permite
 * redirigir al listado con esa búsqueda aplicada.
 */
export function SearchBar({ value, onChange, size = "lg", onSubmit }: SearchBarProps) {
  const isLarge = size === "lg";

  const inputClasses = isLarge
    ? "w-full bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
    : "w-full bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500";

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      className="w-full"
    >
      <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 shadow-sm focus-within:border-green-600 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-green-500">
        <span aria-hidden className="text-gray-400">
          🔍
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="¿Qué quieres hacer?"
          aria-label="¿Qué quieres hacer?"
          className={inputClasses}
        />
      </div>
    </form>
  );
}
