import { AuditLogEvent, Events, GuildBan } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

export default {
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan) {
    const settings = await getGuildSettings(ban.guild.id);
    const entry = await findAuditLogResponsible(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

    await sendLog(
      ban.guild,
      settings,
      "member",
      buildLogEmbed({
        title: "⛔ Membro banido",
        color: Colors.security,
        fields: [
          { name: "Usuário", value: `${ban.user.tag} (<@${ban.user.id}>)` },
          { name: "Motivo", value: entry?.reason ?? ban.reason ?? "*(nenhum motivo informado)*" },
          { name: "Responsável", value: formatResponsible(entry) },
        ],
      })
    );
  },
};
