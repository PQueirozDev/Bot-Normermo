import { GuildSettings } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Cache simples em memória para evitar consultar o banco a cada evento
 * (o bot pode receber dezenas de eventos de voz/mensagens por segundo).
 * O cache é invalidado sempre que as configurações de um servidor mudam.
 */
interface CacheEntry {
  settings: GuildSettings;
  timestamp: number;
}

const CACHE_TTL_MS = 10000; // 10 segundos
const cache = new Map<string, CacheEntry>();

export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  const now = Date.now();
  const cached = cache.get(guildId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) return cached.settings;

  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  });

  cache.set(guildId, { settings, timestamp: now });
  return settings;
}

export async function updateGuildSettings(
  guildId: string,
  data: Partial<Omit<GuildSettings, "guildId" | "createdAt" | "updatedAt">>
): Promise<GuildSettings> {
  const settings = await prisma.guildSettings.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });

  cache.set(guildId, { settings, timestamp: Date.now() });
  return settings;
}

export function invalidateGuildSettingsCache(guildId: string): void {
  cache.delete(guildId);
}

export function getAuthorizedRoleIds(settings: GuildSettings): string[] {
  if (!settings.authorizedRoleIds) return [];
  return settings.authorizedRoleIds.split(",").map((id) => id.trim()).filter(Boolean);
}
