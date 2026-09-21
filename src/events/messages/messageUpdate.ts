import { Events, Message, PartialMessage } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";

const MAX_PREVIEW = 1000;

export default {
  name: Events.MessageUpdate,
  async execute(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) {
    const guild =
      newMessage.guild ??
      (newMessage.channel && "guild" in newMessage.channel ? newMessage.channel.guild : null);
    if (!guild || newMessage.author?.bot) return;
    // Ignora updates que não mudam o texto (ex: embed carregado, reação, pin).
    if (!newMessage.partial && !oldMessage.partial && oldMessage.content === newMessage.content) return;
    // Se a nova mensagem não tem data de edição, foi apenas um update de sistema/embed
    if (newMessage.editedTimestamp === null && oldMessage.editedTimestamp === null) return;

    const settings = await getGuildSettings(guild.id);

    const before = oldMessage.partial
      ? "*(conteúdo indisponível — mensagem não estava em cache)*"
      : oldMessage.content?.slice(0, MAX_PREVIEW) || "*(vazio)*";

    const after = newMessage.partial
      ? "*(conteúdo indisponível)*"
      : newMessage.content?.slice(0, MAX_PREVIEW) || "*(vazio)*";

    await sendLog(
      guild,
      settings,
      "message",
      buildLogEmbed({
        title: "✏️ MENSAGEM EDITADA",
        color: Colors.updated,
        fields: [
          {
            name: "Usuário",
            value: newMessage.author ? `${newMessage.author.tag} (<@${newMessage.author.id}>)` : "*(desconhecido)*",
          },
          { name: "Canal", value: `<#${newMessage.channel.id}>` },
          { name: "Antes", value: before },
          { name: "Depois", value: after },
        ],
      })
    );
  },
};
