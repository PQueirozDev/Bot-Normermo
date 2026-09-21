import { AuditLogEvent, Events, Message, PartialMessage } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";

const MAX_PREVIEW = 1000;
const MAX_EMBED_FIELD = 1024;

export default {
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage) {
    const guild =
      message.guild ??
      (message.channel && "guild" in message.channel ? message.channel.guild : null);
    if (!guild || message.author?.bot) return;

    const settings = await getGuildSettings(guild.id);

    // Se a mensagem não estava em cache (parcial), o Discord não fornece o
    // conteúdo original — deixamos isso explícito em vez de inventar.
    const content = message.partial
      ? "*(conteúdo indisponível — mensagem não estava em cache)*"
      : message.content?.slice(0, MAX_PREVIEW) || "*(sem conteúdo textual — possivelmente anexo/embed)*";

    const attachments =
      !message.partial && message.attachments && message.attachments.size > 0
        ? message.attachments
            .map((a) => `[${a.name ?? "arquivo"}](${a.url})`)
            .join("\n")
            .slice(0, MAX_EMBED_FIELD)
        : null;

    const userDisplay = message.author
      ? `${message.author.tag} (<@${message.author.id}>)`
      : "*(desconhecido)*";
    const channelDisplay = message.channel
      ? `<#${message.channel.id}>`
      : message.channelId
      ? `<#${message.channelId}>`
      : "*(desconhecido)*";

    // O evento MessageDelete não informa quem apagou; buscamos no audit log.
    const entry = await findAuditLogResponsible(guild, AuditLogEvent.MessageDelete, message.author?.id, 5000);

    await sendLog(
      guild,
      settings,
      "message",
      buildLogEmbed({
        title: "🗑️ MENSAGEM APAGADA",
        color: Colors.left,
        fields: [
          { name: "Usuário", value: userDisplay },
          { name: "Canal", value: channelDisplay },
          { name: "Apagada por", value: formatResponsible(entry) },
          { name: "Mensagem", value: content },
          ...(attachments ? [{ name: "Anexo(s)", value: attachments }] : []),
        ],
      })
    );
  },
};
