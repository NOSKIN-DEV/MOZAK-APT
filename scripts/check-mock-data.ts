/**
 * Script de verificación de la Etapa 2.
 *
 * Valida con Zod cada registro de los datos mock, revisa que las
 * referencias entre entidades (category/venueId/sourceId) existan, y
 * hace una prueba rápida del repositorio con filtros combinados.
 *
 * Uso: npm run check:data
 */
import { categories, events, sources, venues } from "../src/data";
import { categorySchema, eventSchema, sourceSchema, venueSchema } from "../src/lib/schemas";
import { eventRepository } from "../src/lib/repositories";

let errors = 0;

function validateAll<T>(label: string, items: T[], schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }) {
  for (const item of items) {
    const result = schema.safeParse(item);
    if (!result.success) {
      errors++;
      const id = (item as { id?: string }).id ?? "(sin id)";
      console.error(`❌ ${label} inválido (id: ${id}):`, JSON.stringify(result.error, null, 2));
    }
  }
  console.log(`${errors === 0 ? "✅" : "⚠️ "} ${label}: ${items.length} registros validados con Zod`);
}

async function main() {
  console.log("== Etapa 2: verificación de datos mock ==\n");

  validateAll("Category", categories, categorySchema);
  validateAll("Venue", venues, venueSchema);
  validateAll("Source", sources, sourceSchema);
  validateAll("Event", events, eventSchema);

  // Integridad referencial: category/venueId/sourceId deben existir.
  const categoryIds = new Set(categories.map((c) => c.id));
  const venueIds = new Set(venues.map((v) => v.id));
  const sourceIds = new Set(sources.map((s) => s.id));

  for (const event of events) {
    if (!categoryIds.has(event.category)) {
      errors++;
      console.error(`❌ Evento ${event.id} referencia una categoría inexistente: ${event.category}`);
    }
    if (!venueIds.has(event.venueId)) {
      errors++;
      console.error(`❌ Evento ${event.id} referencia un venue inexistente: ${event.venueId}`);
    }
    if (!sourceIds.has(event.sourceId)) {
      errors++;
      console.error(`❌ Evento ${event.id} referencia una fuente inexistente: ${event.sourceId}`);
    }
  }
  console.log(`${errors === 0 ? "✅" : "⚠️ "} Integridad referencial revisada\n`);

  // Resumen por categoría y comuna, para confirmar que los filtros tendrán datos de sobra.
  const all = await eventRepository.findAll();
  console.log(`Total de eventos: ${all.length}`);

  const byCategory = new Map<string, number>();
  const byCommune = new Map<string, number>();
  let free = 0;

  for (const e of all) {
    byCategory.set(e.category.name, (byCategory.get(e.category.name) ?? 0) + 1);
    byCommune.set(e.venue.commune, (byCommune.get(e.venue.commune) ?? 0) + 1);
    if (e.isFree) free++;
  }

  console.log("\nEventos por categoría:");
  for (const [name, count] of byCategory) console.log(`  - ${name}: ${count}`);

  console.log("\nEventos por comuna:");
  for (const [name, count] of byCommune) console.log(`  - ${name}: ${count}`);

  console.log(`\nGratuitos: ${free} | Pagados: ${all.length - free}`);

  // Prueba rápida de filtros combinados (categoría + comuna + gratis).
  const combinado = await eventRepository.findAll({
    category: "cat-ferias",
    commune: "Recoleta",
    isFree: true,
  });
  console.log(
    `\nPrueba de filtro combinado (categoría=Ferias, comuna=Recoleta, gratis=true): ${combinado.length} resultado(s) -> ${combinado.map((e) => e.title).join(", ") || "(ninguno)"}`,
  );

  const busqueda = await eventRepository.findAll({ search: "teatro" });
  console.log(`Prueba de búsqueda por texto ("teatro"): ${busqueda.length} resultado(s)`);

  const detalle = await eventRepository.findById("event-001");
  console.log(`\nPrueba findById("event-001"): ${detalle ? `OK -> "${detalle.title}"` : "❌ no encontrado"}`);

  const comunas = await eventRepository.findAllCommunes();
  console.log(`\nComunas disponibles (${comunas.length}): ${comunas.join(", ")}`);

  if (errors > 0) {
    console.error(`\n${errors} error(es) encontrados. Revisa los mensajes anteriores.`);
    process.exit(1);
  }

  console.log("\n✅ Todo correcto: los datos mock y el repositorio están listos para la Etapa 3.");
}

main().catch((err) => {
  console.error("Error inesperado ejecutando la verificación:", err);
  process.exit(1);
});
