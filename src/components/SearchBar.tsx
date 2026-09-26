"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "lg";
}

/**
 * Input de búsqueda controlado. El estado vive en el componente padre
 * (HomePage), que lo usa para consultar /api/events con debounce.
 */
export function SearchBar({ value, onChange, size = "lg" }: SearchBarProps) {
  const isLarge = size === "lg";

  const inputClasses = isLarge
    ? "w-full bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
    : "w-full bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500";

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="w-full">
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
