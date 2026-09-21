import { AuditLogEvent, Events, GuildChannel } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

export default {
  name: Events.ChannelCreate,
  async execute(channel: GuildChannel) {
    const settings = await getGuildSettings(channel.guild.id);
    const entry = await findAuditLogResponsible(channel.guild, AuditLogEvent.ChannelCreate, channel.id);

    await sendLog(
      channel.guild,
      settings,
      "admin",
      buildLogEmbed({
        title: "🟡 Canal criado",
        color: Colors.updated,
        fields: [
          { name: "Canal", value: `${channel.name} (<#${channel.id}>)` },
          { name: "Responsável", value: formatResponsible(entry) },
        ],
      })
    );
  },
};
