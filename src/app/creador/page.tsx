import type { Metadata } from "next";
import { CreatorDashboard } from "@/components/panel/CreatorDashboard";
import { PanelShell } from "@/components/panel/PanelShell";
import { requirePageUser } from "@/lib/server/current-user";

export const metadata: Metadata = {
  title: "Mis eventos | MOZAK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CreatorPage() {
  const user = await requirePageUser("CREATOR");
  return (
    <PanelShell user={user} title="Panel del creador">
      <CreatorDashboard />
    </PanelShell>
  );
}
