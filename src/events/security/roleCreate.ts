import { AuditLogEvent, Events, Role } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

export default {
  name: Events.GuildRoleCreate,
  async execute(role: Role) {
    const settings = await getGuildSettings(role.guild.id);
    const entry = await findAuditLogResponsible(role.guild, AuditLogEvent.RoleCreate, role.id);

    await sendLog(
      role.guild,
      settings,
      "admin",
      buildLogEmbed({
        title: "🟡 Cargo criado",
        color: Colors.updated,
        fields: [
          { name: "Cargo", value: `<@&${role.id}>` },
          { name: "Responsável", value: formatResponsible(entry) },
        ],
      })
    );
  },
};
