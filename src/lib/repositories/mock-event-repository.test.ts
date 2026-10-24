import { describe } from "vitest";
import { defineEventRepositoryContract } from "./event-repository.contract";
import { MockEventRepository } from "./mock-event-repository";

/**
 * Épica APT-8 (Sprint 2) — pruebas de MockEventRepository.
 * La batería vive en event-repository.contract.ts para compartirse con
 * PostgresEventRepository (Etapa 11).
 */
describe("MockEventRepository", () => {
  defineEventRepositoryContract(() => new MockEventRepository());
});
