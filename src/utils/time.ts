/** Formata uma duração em milissegundos como "1h 23min 10s", omitindo unidades zeradas. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (hours === 0 && seconds > 0) parts.push(`${seconds}s`);
  if (parts.length === 0) parts.push("menos de 1min");

  return parts.join(" ");
}

/** Formata "há X tempo" a partir de uma data, em português — usado para idade de conta. */
export function formatRelativeAge(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days >= 1) return `há ${days} dia${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `há ${hours} hora${hours === 1 ? "" : "s"}`;
  if (minutes >= 1) return `há ${minutes} minuto${minutes === 1 ? "" : "s"}`;
  return "há poucos segundos";
}

export function formatTimestamp(date: Date = new Date()): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:t>`;
}

export function formatFullDate(date: Date): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}
