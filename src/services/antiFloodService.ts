/**
 * Detecção de flood: identifica quando o mesmo usuário repete a mesma
 * mensagem várias vezes seguidas dentro de uma janela de tempo.
 */

interface RepeatActivity {
  content: string;
  timestamps: number[];
}

// Chave: `${guildId}:${userId}`
const repeatMap = new Map<string, RepeatActivity>();

export interface FloodCheckResult {
  isFlood: boolean;
  repeatCount: number;
}

function normalize(content: string): string {
  return content.trim().toLowerCase();
}

export function registerMessageAndCheckFlood(
  guildId: string,
  userId: string,
  content: string,
  maxRepeats: number,
  intervalMs: number
): FloodCheckResult {
  const key = `${guildId}:${userId}`;
  const normalized = normalize(content);
  const now = Date.now();

  const activity = repeatMap.get(key);

  if (!activity || activity.content !== normalized) {
    repeatMap.set(key, { content: normalized, timestamps: [now] });
    return { isFlood: false, repeatCount: 1 };
  }

  activity.timestamps = activity.timestamps.filter((ts) => now - ts <= intervalMs);
  activity.timestamps.push(now);

  return {
    isFlood: activity.timestamps.length >= maxRepeats,
    repeatCount: activity.timestamps.length,
  };
}

export function resetFloodCounter(guildId: string, userId: string): void {
  repeatMap.delete(`${guildId}:${userId}`);
}
