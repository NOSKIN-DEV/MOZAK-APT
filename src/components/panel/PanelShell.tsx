"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { PublicUser } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "./api-client";
import { secondaryButton } from "./ui";

interface PanelShellProps {
  user: PublicUser;
  title: string;
  children: ReactNode;
}

/** Encabezado común de los paneles de creador y administrador (con cierre de sesión). */
export function PanelShell({ user, title, children }: PanelShellProps) {
  const router = useRouter();

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/ingresar");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">
              MOZAK
            </Link>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 dark:text-gray-300 sm:inline">
              {user.name} · {user.role === "ADMIN" ? "Administrador" : "Creador"}
            </span>
            <button type="button" onClick={logout} className={secondaryButton}>
              Cerrar sesión
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
