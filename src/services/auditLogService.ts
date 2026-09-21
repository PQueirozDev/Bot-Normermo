import { AuditLogEvent, Guild, GuildAuditLogsEntry } from "discord.js";

const RESPONSIBLE_UNKNOWN = "Não identificado";

/**
 * Busca a entrada mais recente do Audit Log de um determinado tipo que
 * aponte para um alvo específico e tenha acontecido nos últimos `withinMs`.
 * Retorna null se não houver evidência suficiente — nunca "adivinha" um
 * responsável, conforme exigido no requisito 8.
 */
export async function findAuditLogResponsible(
  guild: Guild,
  type: AuditLogEvent,
  targetId: string | undefined,
  withinMs = 10000
): Promise<GuildAuditLogsEntry | null> {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find((e) => {
      const matchesTarget = targetId
        ? e.targetId === targetId || (e.target && "id" in e.target && e.target.id === targetId)
        : true;
      const isRecent = Date.now() - e.createdTimestamp <= withinMs;
      return matchesTarget && isRecent;
    });
    return entry ?? null;
  } catch (error) {
    console.error(`[auditLogService] Falha ao consultar audit logs (guild ${guild.id}):`, error);
    return null;
  }
}

export function formatResponsible(entry: GuildAuditLogsEntry | null): string {
  if (!entry || !entry.executor) return RESPONSIBLE_UNKNOWN;
  return `${entry.executor.tag} (<@${entry.executor.id}>)`;
}

export { RESPONSIBLE_UNKNOWN };
