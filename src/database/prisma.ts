import { PrismaClient } from "@prisma/client";

/**
 * SQLite só aceita um escritor por vez. Com várias conexões no pool, escritas
 * simultâneas (ex.: vários eventos de voz) disputam o lock e estouram o timeout
 * (erro P1008). Usamos 1 conexão e um tempo de espera maior.
 */
function buildDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("file:")) return url;
  const params = new URLSearchParams(url.split("?")[1] ?? "");
  if (!params.has("connection_limit")) params.set("connection_limit", "1");
  if (!params.has("socket_timeout")) params.set("socket_timeout", "30");
  return `${url.split("?")[0]}?${params.toString()}`;
}

const databaseUrl = buildDatabaseUrl();

/**
 * Instância única do Prisma Client, reutilizada em todo o projeto.
 */
export const prisma = new PrismaClient(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);

/** Ativa WAL (leituras não bloqueiam escritas) e espera pelo lock em vez de falhar na hora. */
export async function configureDatabase(): Promise<void> {
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 30000;");
  } catch (error) {
    console.warn("[database] Não foi possível aplicar PRAGMAs do SQLite:", error);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
