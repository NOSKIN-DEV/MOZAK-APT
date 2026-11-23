import type { PrismaClient } from "@prisma/client";
import type { UserRecord, UserRole } from "@/types";
import { EmailAlreadyUsedError, type UserRepository } from "./management-repository";
import { isUniqueViolation, toUserRecord } from "./postgres-management-mapping";

/**
 * Usuarios (administradores y creadores) en PostgreSQL. Cumple el mismo contrato
 * que MockUserRepository (management-repository.contract.ts).
 */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return row ? toUserRecord(row) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUserRecord(row) : null;
  }

  async list(filter: { role?: UserRole } = {}): Promise<UserRecord[]> {
    const rows = await this.prisma.user.findMany({ where: filter.role ? { role: filter.role } : {} });
    // Se ordena en JS con el criterio del español, igual que el repositorio mock.
    return rows.map(toUserRecord).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async create(user: UserRecord): Promise<UserRecord> {
    const email = user.email.trim().toLowerCase();
    try {
      const row = await this.prisma.user.create({
        data: {
          id: user.id,
          email,
          name: user.name,
          passwordHash: user.passwordHash,
          role: user.role,
          active: user.active,
          createdAt: new Date(user.createdAt),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        },
      });
      return toUserRecord(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyUsedError(email);
      }
      throw error;
    }
  }

  async setActive(id: string, active: boolean): Promise<UserRecord | null> {
    const result = await this.prisma.user.updateMany({ where: { id }, data: { active } });
    return result.count === 0 ? null : this.findById(id);
  }

  async recordLogin(id: string, at: string): Promise<void> {
    await this.prisma.user.updateMany({ where: { id }, data: { lastLoginAt: new Date(at) } });
  }
}
