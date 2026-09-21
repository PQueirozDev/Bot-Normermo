import { ChannelType, EmbedBuilder, Guild } from "discord.js";
import { GuildSettings } from "@prisma/client";

export type LogCategory = "voice" | "message" | "member" | "admin" | "security";

const channelFieldByCategory: Record<LogCategory, keyof GuildSettings> = {
  voice: "voiceLogChannel",
  message: "messageLogChannel",
  member: "memberLogChannel",
  admin: "adminLogChannel",
  security: "securityLogChannel",
};

/** Nome do canal de fallback, criado automaticamente se não existir. */
const FALLBACK_CHANNEL_NAME = "logs-seguranca";

/** Cache do canal de fallback por guild, para não criar canais duplicados. */
const fallbackChannelCache = new Map<string, string>();

/** Evita tentar criar o canal a cada evento quando o bot não tem permissão. */
const CREATE_RETRY_MS = 60_000;
const lastFailedCreateAt = new Map<string, number>();

/**
 * Resolve o canal de log na seguinte ordem:
 * 1. Canal configurado para a categoria (ou o de segurança geral);
 * 2. Canal de texto chamado #logs-seguranca (do cache ou procurado no servidor);
 * 3. Cria o canal #logs-seguranca se o bot tiver permissão de gerenciar canais.
 * Retorna null se nada der certo — nesse caso o log é descartado silenciosamente.
 */
async function resolveLogChannel(
  guild: Guild,
  configuredId: string | null
): Promise<string | null> {
  // 1. Canal configurado — só é usado se ainda existir de verdade.
  if (configuredId) {
    let channel = guild.channels.cache.get(configuredId);
    if (!channel) {
      try {
        channel = (await guild.channels.fetch(configuredId)) ?? undefined;
      } catch {
        channel = undefined; // canal deletado ou ID inválido
      }
    }
    if (channel) return configuredId;
  }

  // 2. Canal de fallback existente (cache ou busca por nome).
  const cachedId = fallbackChannelCache.get(guild.id);
  if (cachedId && guild.channels.cache.has(cachedId)) return cachedId;

  const existing = guild.channels.cache.find(
    (c) => c.name === FALLBACK_CHANNEL_NAME && c.isTextBased()
  );
  if (existing) {
    fallbackChannelCache.set(guild.id, existing.id);
    return existing.id;
  }

  // 3. Criar o canal de fallback (com retry limitado para não martelar a API).
  const lastFail = lastFailedCreateAt.get(guild.id);
  if (lastFail && Date.now() - lastFail < CREATE_RETRY_MS) return null;

  try {
    const created = await guild.channels.create({
      name: FALLBACK_CHANNEL_NAME,
      type: ChannelType.GuildText,
      reason: "Canal de logs criado automaticamente pelo bot de segurança",
    });
    fallbackChannelCache.set(guild.id, created.id);
    lastFailedCreateAt.delete(guild.id);
    return created.id;
  } catch (error) {
    lastFailedCreateAt.set(guild.id, Date.now());
    console.error(
      `[loggingService] Não foi possível criar o canal #${FALLBACK_CHANNEL_NAME} na guild ${guild.id} (verifique a permissão "Gerenciar canais"):`,
      error
    );
    return null;
  }
}

/**
 * Envia um embed de log para o canal configurado da categoria correspondente.
 * Se a categoria específica não tiver canal configurado (ou o canal tiver sido
 * deletado), cai de volta para #logs-seguranca — criando o canal se necessário.
 */
export async function sendLog(
  guild: Guild,
  settings: GuildSettings,
  category: LogCategory,
  embed: EmbedBuilder
): Promise<void> {
  const specificChannelId = settings[channelFieldByCategory[category]] as string | null;
  const channelId = await resolveLogChannel(guild, specificChannelId ?? settings.securityLogChannel);
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased() || !("send" in channel) || typeof channel.send !== "function") return;

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[loggingService] Falha ao enviar log (${category}) na guild ${guild.id}:`, error);
  }
}
