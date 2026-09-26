"use client";

import Link from "next/link";
import { SearchBar } from "./SearchBar";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function Header({ searchValue, onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span aria-hidden className="text-2xl">
              📍
            </span>
            APT
          </Link>
          <nav className="text-sm font-medium text-gray-600 sm:hidden">
            <Link href="/" className="hover:text-gray-900">
              Inicio
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4 sm:flex-1 sm:justify-end">
          <nav className="hidden shrink-0 text-sm font-medium text-gray-600 sm:block">
            <Link href="/" className="hover:text-gray-900">
              Inicio
            </Link>
          </nav>
          <div className="w-full sm:max-w-xs">
            <SearchBar size="sm" value={searchValue} onChange={onSearchChange} />
          </div>
        </div>
      </div>
    </header>
  );
}
