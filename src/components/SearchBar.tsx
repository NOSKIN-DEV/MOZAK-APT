"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "lg";
}

/**
 * Input de búsqueda controlado. Todavía no dispara la búsqueda real
 * contra la API (eso se conecta en la Etapa 5): por ahora solo
 * mantiene el texto en el estado del componente padre.
 */
export function SearchBar({ value, onChange, size = "lg" }: SearchBarProps) {
  const isLarge = size === "lg";

  const inputClasses = isLarge
    ? "w-full bg-transparent py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
    : "w-full bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none";

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="w-full">
      <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 shadow-sm focus-within:border-green-600">
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
