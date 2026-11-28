import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/panel/LoginForm";
import { getCurrentUser, homeFor } from "@/lib/server/current-user";

export const metadata: Metadata = {
  title: "Acceso para organizadores | MOZAK",
  robots: { index: false, follow: false },
};

// Lee la cookie de sesión: no se puede generar de antemano.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(homeFor(user.role));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        MOZAK
      </Link>
      <LoginForm />
      <Link href="/" className="text-sm font-medium text-green-700 hover:text-green-800 dark:text-green-400">
        ← Volver a los eventos
      </Link>
    </main>
  );
}
