import type { Metadata } from "next";
import { AdminDashboard } from "@/components/panel/AdminDashboard";
import { PanelShell } from "@/components/panel/PanelShell";
import { requirePageUser } from "@/lib/server/current-user";

export const metadata: Metadata = {
  title: "Administración | MOZAK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requirePageUser("ADMIN");
  return (
    <PanelShell user={user} title="Administración">
      <AdminDashboard />
    </PanelShell>
  );
}
