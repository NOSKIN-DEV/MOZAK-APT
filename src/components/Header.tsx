"use client";

import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Opcional: en el listado no se usa (ya filtra en vivo); en otras páginas permite volver al listado con esta búsqueda aplicada. */
  onSearchSubmit?: (value: string) => void;
}

export function Header({ searchValue, onSearchChange, onSearchSubmit }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">
            MOZAK
          </Link>
          <div className="flex items-center gap-3 sm:hidden">
            <nav className="text-sm font-medium text-gray-600 dark:text-gray-300">
              <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-50">
                Inicio
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:flex-1 sm:justify-end">
          <nav className="hidden shrink-0 text-sm font-medium text-gray-600 dark:text-gray-300 sm:block">
            <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-50">
              Inicio
            </Link>
          </nav>
          <div className="w-full sm:max-w-xs">
            <SearchBar size="sm" value={searchValue} onChange={onSearchChange} onSubmit={onSearchSubmit} />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
