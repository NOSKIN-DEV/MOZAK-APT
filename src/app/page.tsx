export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
        Etapa 1 — Proyecto base configurado
      </span>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        APT — Descubre qué hacer cerca de ti
      </h1>
      <p className="max-w-xl text-gray-600">
        Este es el placeholder inicial del prototipo. En las próximas etapas
        se agregarán los datos mock, la API interna, el buscador, los filtros
        y la vista de detalle de evento.
      </p>
    </main>
  );
}
