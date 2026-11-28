"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { PublicUser } from "@/types";
import { api, messageOf } from "./api-client";
import { ErrorBanner, Field, cardClasses, inputClasses, primaryButton } from "./ui";

/** Inicio de sesión de administradores y creadores. El público general no necesita cuenta. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api<{ data: PublicUser }>("/api/auth/login", { method: "POST", body: { email, password } });
      router.replace(data.role === "ADMIN" ? "/admin" : "/creador");
      router.refresh();
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${cardClasses} flex w-full max-w-sm flex-col gap-4`}>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Acceso para organizadores</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Solo para creadores de eventos y administradores. Para ver eventos no necesitas cuenta.
        </p>
      </div>
      <ErrorBanner message={error} />
      <Field label="Correo" htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClasses}
        />
      </Field>
      <Field label="Contraseña" htmlFor="login-password">
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClasses}
        />
      </Field>
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
