import type { EventWithRelations } from "@/lib/repositories";

/**
 * Forma que expone la API interna para un evento. Es más completa que
 * el ejemplo mínimo de la sección 11 del documento de requisitos
 * (category/venue como strings sueltos): aquí category y venue vienen
 * como objetos, porque tanto el listado (tarjetas) como el detalle de
 * evento (Etapa 6) necesitan estos datos y así evitamos una segunda
 * llamada a la API para el detalle.
 */
export interface ApiEvent {
  id: string;
  externalId: string | null;
  title: string;
  description: string;
  category: {
    id: string;
    name: string;
  };
  venue: {
    id: string;
    name: string;
    address: string;
    commune: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  source: {
    name: string;
    organization: string;
    url: string;
  };
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  price: number;
  isFree: boolean;
  imageUrl: string | null;
  sourceUrl: string;
}

export function toApiEvent(event: EventWithRelations): ApiEvent {
  return {
    id: event.id,
    externalId: event.externalId,
    title: event.title,
    description: event.description,
    category: {
      id: event.category.id,
      name: event.category.name,
    },
    venue: {
      id: event.venue.id,
      name: event.venue.name,
      address: event.venue.address,
      commune: event.venue.commune,
      city: event.venue.city,
      latitude: event.venue.latitude,
      longitude: event.venue.longitude,
    },
    source: {
      name: event.source.name,
      organization: event.source.organization,
      url: event.source.url,
    },
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    price: event.price,
    isFree: event.isFree,
    imageUrl: event.imageUrl,
    sourceUrl: event.sourceUrl,
  };
}
