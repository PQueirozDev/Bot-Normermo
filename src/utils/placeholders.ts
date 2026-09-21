import { GuildMember, PartialGuildMember } from "discord.js";
import { formatFullDate } from "./time";

/**
 * Substitui as variáveis permitidas em mensagens configuráveis de boas-vindas/saída/DM.
 * Suporta: {user} {username} {server} {memberCount} {accountCreated}
 */
export function applyPlaceholders(template: string, member: GuildMember | PartialGuildMember): string {
  const username = member.user?.username ?? (member as GuildMember).displayName ?? "membro";
  const createdDate = member.user?.createdAt ? formatFullDate(member.user.createdAt) : "N/A";

  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", username)
    .replaceAll("{server}", member.guild?.name ?? "servidor")
    .replaceAll("{memberCount}", String(member.guild?.memberCount ?? 0))
    .replaceAll("{accountCreated}", createdDate);
}
