import { AuditLogEvent, Events, Role } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

export default {
  name: Events.GuildRoleDelete,
  async execute(role: Role) {
    const settings = await getGuildSettings(role.guild.id);
    const entry = await findAuditLogResponsible(role.guild, AuditLogEvent.RoleDelete, role.id);

    await sendLog(
      role.guild,
      settings,
      "admin",
      buildLogEmbed({
        title: "🔴 Cargo excluído",
        color: Colors.left,
        fields: [
          { name: "Cargo", value: `${role.name} (${role.id})` },
          { name: "Responsável", value: formatResponsible(entry) },
        ],
      })
    );
  },
};
