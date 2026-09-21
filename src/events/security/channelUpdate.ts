import { AuditLogEvent, Events, GuildChannel } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

export default {
  name: Events.ChannelUpdate,
  async execute(oldChannel: GuildChannel, newChannel: GuildChannel) {
    const changes: string[] = [];
    if (oldChannel.name !== newChannel.name) changes.push(`Nome: \`${oldChannel.name}\` → \`${newChannel.name}\``);
    if ("topic" in oldChannel && "topic" in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push("Tópico alterado");
    }
    if (oldChannel.parentId !== newChannel.parentId) changes.push("Categoria alterada");
    if (
      "permissionOverwrites" in oldChannel &&
      "permissionOverwrites" in newChannel &&
      !oldChannel.permissionOverwrites.cache.equals(newChannel.permissionOverwrites.cache)
    ) {
      changes.push("Permissões do canal alteradas");
    }

    if (changes.length === 0) return; // evita ruído com mudanças irrelevantes (ex: posição)

    const settings = await getGuildSettings(newChannel.guild.id);
    const entry = await findAuditLogResponsible(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);

    await sendLog(
      newChannel.guild,
      settings,
      "admin",
      buildLogEmbed({
        title: "🟡 Canal alterado",
        color: Colors.updated,
        fields: [
          { name: "Canal", value: `<#${newChannel.id}>` },
          { name: "Mudanças", value: changes.join("\n") },
          { name: "Responsável", value: formatResponsible(entry) },
        ],
      })
    );
  },
};
