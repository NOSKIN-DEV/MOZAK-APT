import type { Metadata } from "next";
import { EventForm } from "@/components/panel/EventForm";
import { PanelShell } from "@/components/panel/PanelShell";
import { requirePageUser } from "@/lib/server/current-user";

export const metadata: Metadata = {
  title: "Evento | MOZAK",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** /creador/eventos/nuevo crea un evento; /creador/eventos/<id> edita uno propio. */
export default async function CreatorEventPage({ params }: PageProps) {
  const user = await requirePageUser("CREATOR");
  const { id } = await params;
  return (
    <PanelShell user={user} title="Panel del creador">
      <EventForm eventId={id === "nuevo" ? null : id} />
    </PanelShell>
  );
}
