import { Events, Message } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { registerMessageAndCheckSpam, resetSpamCounter } from "../../services/antiSpamService";
import { registerMessageAndCheckFlood, resetFloodCounter } from "../../services/antiFloodService";

const AUTO_PUNISH_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (!message.guild || message.author.bot) return;

    const settings = await getGuildSettings(message.guild.id);
    const guildId = message.guild.id;
    const userId = message.author.id;

    // --- 9. Anti-Spam ---
    if (settings.antiSpamEnabled) {
      const { isSpam, messageCount } = registerMessageAndCheckSpam(
        guildId,
        userId,
        settings.antiSpamMaxMessages,
        settings.antiSpamIntervalMs
      );

      if (isSpam) {
        resetSpamCounter(guildId, userId);

        await sendLog(
          message.guild,
          settings,
          "security",
          buildLogEmbed({
            title: "⚠️ POSSÍVEL SPAM",
            color: Colors.alert,
            fields: [
              { name: "Usuário", value: `${message.author.tag} (<@${userId}>)` },
              { name: "Mensagens", value: `${messageCount}` },
              { name: "Intervalo", value: `${settings.antiSpamIntervalMs / 1000}s` },
            ],
          })
        );

        if (settings.antiSpamAutoPunish && message.member?.moderatable) {
          try {
            await message.member.timeout(AUTO_PUNISH_TIMEOUT_MS, "Punição automática: anti-spam");
          } catch (error) {
            console.error(`[messageCreate] Falha ao aplicar timeout automático (guild ${guildId}):`, error);
          }
        }
        return; // evita também disparar anti-flood na mesma mensagem
      }
    }

    // --- 10. Anti-Flood ---
    if (settings.antiFloodEnabled && message.content.trim().length > 0) {
      const { isFlood, repeatCount } = registerMessageAndCheckFlood(
        guildId,
        userId,
        message.content,
        settings.antiFloodMaxRepeats,
        settings.antiFloodIntervalMs
      );

      if (isFlood) {
        resetFloodCounter(guildId, userId);

        await sendLog(
          message.guild,
          settings,
          "security",
          buildLogEmbed({
            title: "⚠️ POSSÍVEL FLOOD",
            color: Colors.alert,
            fields: [
              { name: "Usuário", value: `${message.author.tag} (<@${userId}>)` },
              { name: "Repetições", value: `${repeatCount}` },
              { name: "Mensagem", value: message.content.slice(0, 300) },
            ],
          })
        );
      }
    }
  },
};
