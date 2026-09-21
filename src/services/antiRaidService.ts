/**
 * Detecção de possível raid: acompanha entradas recentes de membros por
 * servidor e verifica se o número de entradas em uma janela curta ultrapassa
 * o limite configurado.
 */

const joinTimestampsByGuild = new Map<string, number[]>();

export interface RaidCheckResult {
  isPossibleRaid: boolean;
  recentJoinCount: number;
}

export function registerJoinAndCheckRaid(
  guildId: string,
  threshold: number,
  intervalMs: number
): RaidCheckResult {
  const now = Date.now();
  const timestamps = (joinTimestampsByGuild.get(guildId) ?? []).filter(
    (ts) => now - ts <= intervalMs
  );
  timestamps.push(now);
  joinTimestampsByGuild.set(guildId, timestamps);

  return {
    isPossibleRaid: timestamps.length >= threshold,
    recentJoinCount: timestamps.length,
  };
}

/** Evita alertar repetidamente para o mesmo pico de entradas. */
export function resetRaidCounter(guildId: string): void {
  joinTimestampsByGuild.delete(guildId);
}
