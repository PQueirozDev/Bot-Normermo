import { PrismaClient } from "@prisma/client";

/**
 * Instância única do Prisma Client, reutilizada em todo o projeto.
 * Evita abrir múltiplas conexões com o SQLite durante hot-reload em dev.
 */
export const prisma = new PrismaClient();

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
