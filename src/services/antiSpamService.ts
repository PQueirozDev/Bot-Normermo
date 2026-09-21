/**
 * Detecção de spam: conta quantas mensagens cada usuário envia dentro de uma
 * janela deslizante de tempo. Estado mantido em memória por processo — não
 * precisa persistir, pois é um contador transitório.
 */

interface UserActivity {
  timestamps: number[];
}

// Chave: `${guildId}:${userId}`
const activityMap = new Map<string, UserActivity>();

export interface SpamCheckResult {
  isSpam: boolean;
  messageCount: number;
}

export function registerMessageAndCheckSpam(
  guildId: string,
  userId: string,
  maxMessages: number,
  intervalMs: number
): SpamCheckResult {
  const key = `${guildId}:${userId}`;
  const now = Date.now();
  const activity = activityMap.get(key) ?? { timestamps: [] };

  activity.timestamps.push(now);
  activity.timestamps = activity.timestamps.filter((ts) => now - ts <= intervalMs);
  activityMap.set(key, activity);

  return {
    isSpam: activity.timestamps.length >= maxMessages,
    messageCount: activity.timestamps.length,
  };
}

/** Limpa o contador de um usuário após um alerta, para não disparar repetidamente. */
export function resetSpamCounter(guildId: string, userId: string): void {
  activityMap.delete(`${guildId}:${userId}`);
}
