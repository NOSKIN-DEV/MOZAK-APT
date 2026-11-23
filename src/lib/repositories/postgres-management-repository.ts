import type { Prisma, PrismaClient } from "@prisma/client";
import type { EventStatus, Venue } from "@/types";
import type {
  EventContent,
  EventManagementRepository,
  ManagedEvent,
  ModerationReviewRecord,
  NewManagedEvent,
  TransitionRequest,
} from "./management-repository";
import { toManagedEvent, toReviewRecord } from "./postgres-management-mapping";
import { toDbDate, toDbTime } from "./postgres-mapping";

/**
 * Qué cargar con cada evento: relaciones, autor y la última decisión (con el
 * nombre de quien la tomó). `satisfies` conserva los tipos literales para que
 * Prisma deduzca bien la forma del resultado (mismo motivo que `as const` en
 * WITH_RELATIONS de postgres-event-repository.ts).
 */
const MANAGED_INCLUDE = {
  category: true,
  venue: true,
  source: true,
  createdBy: { select: { id: true, name: true, email: true } },
  reviews: {
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    include: { reviewer: { select: { name: true } } },
  },
} satisfies Prisma.EventInclude;

/** Campos de contenido del evento, en el formato de la base. */
function contentData(content: EventContent) {
  return {
    title: content.title,
    description: content.description,
    categoryId: content.category,
    venueId: content.venueId,
    startDate: toDbDate(content.startDate),
    endDate: toDbDate(content.endDate),
    startTime: toDbTime(content.startTime),
    endTime: toDbTime(content.endTime),
    price: content.price,
    isFree: content.isFree,
    imageUrl: content.imageUrl,
    posterImageUrl: content.posterImageUrl,
    videoUrl: content.videoUrl,
    sourceUrl: content.sourceUrl,
  };
}

const toDate = (value: string | null | undefined): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(value);

/**
 * Gestión de eventos (creación, edición, cambios de estado y auditoría) en
 * PostgreSQL. Cumple el mismo contrato que MockEventManagementRepository
 * (management-repository.contract.ts).
 *
 * Los cambios de estado usan UPDATE ... WHERE status IN (...) y la decisión se
 * guarda en la MISMA transacción: si dos administradores deciden a la vez, la
 * base serializa los UPDATE y el segundo no encuentra el estado esperado.
 */
export class PostgresEventManagementRepository implements EventManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listVenues(): Promise<Venue[]> {
    const rows = await this.prisma.venue.findMany();
    return rows.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async findVenueById(id: string): Promise<Venue | null> {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  async createVenue(venue: Venue): Promise<Venue> {
    return this.prisma.venue.create({ data: venue });
  }

  async createEvent(input: NewManagedEvent): Promise<ManagedEvent> {
    const row = await this.prisma.event.create({
      data: {
        id: input.id,
        ...contentData(input.content),
        sourceId: input.sourceId,
        status: "DRAFT",
        createdById: input.createdById,
        createdAt: new Date(input.at),
        updatedAt: new Date(input.at),
      },
      include: MANAGED_INCLUDE,
    });
    return toManagedEvent(row);
  }

  async updateContent(
    id: string,
    content: EventContent,
    allowedStatuses: readonly EventStatus[],
    at: string,
  ): Promise<ManagedEvent | null> {
    const result = await this.prisma.event.updateMany({
      where: { id, status: { in: [...allowedStatuses] } },
      data: { ...contentData(content), updatedAt: new Date(at) },
    });
    return result.count === 0 ? null : this.findManagedById(id);
  }

  async findManagedById(id: string): Promise<ManagedEvent | null> {
    const row = await this.prisma.event.findUnique({ where: { id }, include: MANAGED_INCLUDE });
    return row ? toManagedEvent(row) : null;
  }

  async listManaged(filter: { status?: EventStatus; createdById?: string } = {}): Promise<ManagedEvent[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.createdById ? { createdById: filter.createdById } : {}),
      },
      include: MANAGED_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
    return rows.map(toManagedEvent);
  }

  async transition(request: TransitionRequest): Promise<ManagedEvent | null> {
    const { set, review } = request;
    const changed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.event.updateMany({
        where: { id: request.id, status: { in: [...request.from] } },
        data: {
          status: request.to,
          updatedAt: new Date(request.at),
          submittedAt: toDate(set?.submittedAt),
          reviewedAt: toDate(set?.reviewedAt),
          contentPolicyAcceptedAt: toDate(set?.contentPolicyAcceptedAt),
        },
      });
      if (result.count === 0) {
        return false;
      }
      if (review) {
        await tx.moderationReview.create({
          data: {
            id: review.id,
            eventId: review.eventId,
            reviewerId: review.reviewerId,
            decision: review.decision,
            reasonCategory: review.reasonCategory,
            note: review.note,
            flaggedCategories: review.flaggedCategories,
            checklistConfirmed: review.checklistConfirmed,
            policyVersion: review.policyVersion,
            createdAt: new Date(review.createdAt),
          },
        });
      }
      return true;
    });
    return changed ? this.findManagedById(request.id) : null;
  }

  async listReviews(eventId: string): Promise<ModerationReviewRecord[]> {
    const rows = await this.prisma.moderationReview.findMany({
      where: { eventId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { reviewer: { select: { name: true } } },
    });
    return rows.map(toReviewRecord);
  }
}
