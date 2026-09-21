import { AuditLogEvent, Events, Role } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

export default {
  name: Events.GuildRoleUpdate,
  async execute(oldRole: Role, newRole: Role) {
    const changes: string[] = [];
    if (oldRole.name !== newRole.name) changes.push(`Nome: \`${oldRole.name}\` → \`${newRole.name}\``);
    if (oldRole.color !== newRole.color) changes.push("Cor alterada");
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push("Permissões alteradas");
    if (oldRole.hoist !== newRole.hoist) changes.push(`Exibição separada: ${newRole.hoist ? "ativada" : "desativada"}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`Mencionável: ${newRole.mentionable ? "sim" : "não"}`);

    if (changes.length === 0) return;

    const settings = await getGuildSettings(newRole.guild.id);
    const entry = await findAuditLogResponsible(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);

    await sendLog(
      newRole.guild,
      settings,
      "admin",
      buildLogEmbed({
        title: "🟡 Cargo alterado",
        color: Colors.updated,
        fields: [
          { name: "Cargo", value: `<@&${newRole.id}>` },
          { name: "Mudanças", value: changes.join("\n") },
          { name: "Responsável", value: formatResponsible(entry) },
        ],
      })
    );
  },
};
