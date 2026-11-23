"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { PublicUser } from "@/types";
import { ApiError, api, messageOf, type ApiIssue } from "./api-client";
import { ErrorBanner, Field, cardClasses, formatMoment, inputClasses, primaryButton, secondaryButton } from "./ui";

/** Cuentas de los creadores: el administrador las crea y puede activarlas o desactivarlas. No hay registro abierto. */
export function UsersPanel({ onUnauthenticated }: { onUnauthenticated: () => void }) {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [busy, setBusy] = useState(false);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthenticated();
        return;
      }
      setError(messageOf(err));
      if (err instanceof ApiError) setIssues(err.issues);
    },
    [onUnauthenticated],
  );

  const load = useCallback(async () => {
    try {
      setUsers((await api<{ data: PublicUser[] }>("/api/admin/users")).data);
    } catch (err) {
      fail(err);
    }
  }, [fail]);

  useEffect(() => {
    load();
  }, [load]);

  const issue = (path: string) => issues.find((i) => i.path === path)?.message;

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setIssues([]);
    try {
      await api("/api/admin/users", { method: "POST", body: { name, email, password } });
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (user: PublicUser) => {
    setError(null);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body: { active: !user.active } });
      await load();
    } catch (err) {
      fail(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ErrorBanner message={error} />

      <form onSubmit={create} className={`${cardClasses} grid gap-4 sm:grid-cols-2`}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 sm:col-span-2">Nueva cuenta de creador</h2>
        <Field label="Nombre (persona u organización)" htmlFor="user-name" error={issue("name")}>
          <input id="user-name" className={inputClasses} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Correo" htmlFor="user-email" error={issue("email")}>
          <input id="user-email" type="email" className={inputClasses} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Contraseña inicial" htmlFor="user-password" error={issue("password")} hint="Mínimo 10 caracteres. Entrégala por un canal seguro.">
          <input id="user-password" type="password" autoComplete="new-password" className={inputClasses} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Creando…" : "Crear cuenta"}
          </button>
        </div>
      </form>

      {users === null && !error && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando cuentas…</p>}
      {users?.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay creadores. Crea la primera cuenta arriba.</p>}
      <ul className="flex flex-col gap-3">
        {users?.map((user) => (
          <li key={user.id} className={`${cardClasses} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-50">{user.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {user.email} · Último ingreso: {formatMoment(user.lastLoginAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${user.active ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                {user.active ? "Activa" : "Desactivada"}
              </span>
              <button type="button" className={secondaryButton} onClick={() => toggle(user)}>
                {user.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
