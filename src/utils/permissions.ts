import { GuildMember, PermissionFlagsBits } from "discord.js";
import { getAuthorizedRoleIds, getGuildSettings } from "../database/guildSettings";

/**
 * Verifica se um membro pode executar comandos administrativos do bot.
 * Sempre valida no próprio bot (não confia apenas na visibilidade do comando
 * no Discord), conforme exigido: administradores do servidor OU membros com
 * um dos cargos autorizados configurados via /config authorized-role.
 */
export async function isAuthorized(member: GuildMember): Promise<boolean> {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const settings = await getGuildSettings(member.guild.id);
  const authorizedRoleIds = getAuthorizedRoleIds(settings);
  if (authorizedRoleIds.length === 0) return false;

  return member.roles.cache.some((role) => authorizedRoleIds.includes(role.id));
}
