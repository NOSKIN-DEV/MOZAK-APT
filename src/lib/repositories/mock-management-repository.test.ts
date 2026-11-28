import { describe } from "vitest";
import { defineManagementRepositoryContract } from "./management-repository.contract";
import { MockEventManagementRepository, MockUserRepository } from "./mock-management-repository";
import { MockEventRepository } from "./mock-event-repository";
import { MemoryStore } from "./memory-store";

describe("MockEventManagementRepository y MockUserRepository (contrato)", () => {
  defineManagementRepositoryContract(() => {
    const store = MemoryStore.seeded();
    return {
      management: new MockEventManagementRepository(store),
      users: new MockUserRepository(store),
      publicEvents: new MockEventRepository(store),
    };
  });
});
