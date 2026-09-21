import { Events, VoiceState } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { prisma } from "../../database/prisma";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { formatDuration } from "../../utils/time";

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;
    const settings = await getGuildSettings(guild.id);
    const member = newState.member ?? oldState.member;
    if (!member) return;

    const userTag = `${member.user.tag} (<@${member.id}>)`;

    // --- Entrou em uma call (não estava em nenhuma antes) ---
    if (!oldState.channelId && newState.channelId) {
      await prisma.voiceSession.upsert({
        where: { guildId_userId: { guildId: guild.id, userId: member.id } },
        update: { channelId: newState.channelId, joinedAt: new Date() },
        create: { guildId: guild.id, userId: member.id, channelId: newState.channelId },
      });

      await sendLog(
        guild,
        settings,
        "voice",
        buildLogEmbed({
          title: "🟢 ENTROU NA CALL",
          color: Colors.joined,
          fields: [
            { name: "Usuário", value: userTag },
            { name: "Canal", value: `<#${newState.channelId}>` },
          ],
        })
      );
    }

    // --- Saiu de uma call (estava em uma, agora em nenhuma) ---
    else if (oldState.channelId && !newState.channelId) {
      const session = await prisma.voiceSession.findUnique({
        where: { guildId_userId: { guildId: guild.id, userId: member.id } },
      });
      const durationMs = session ? Date.now() - session.joinedAt.getTime() : null;

      await prisma.voiceSession
        .delete({ where: { guildId_userId: { guildId: guild.id, userId: member.id } } })
        .catch(() => undefined);

      await sendLog(
        guild,
        settings,
        "voice",
        buildLogEmbed({
          title: "🔴 SAIU DA CALL",
          color: Colors.left,
          fields: [
            { name: "Usuário", value: userTag },
            { name: "Canal", value: `<#${oldState.channelId}>` },
            ...(durationMs !== null ? [{ name: "Tempo conectado", value: formatDuration(durationMs) }] : []),
          ],
        })
      );
    }

    // --- Trocou de call ---
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      await prisma.voiceSession.upsert({
        where: { guildId_userId: { guildId: guild.id, userId: member.id } },
        update: { channelId: newState.channelId },
        create: { guildId: guild.id, userId: member.id, channelId: newState.channelId },
      });

      await sendLog(
        guild,
        settings,
        "voice",
        buildLogEmbed({
          title: "🔄 MUDOU DE CALL",
          color: Colors.updated,
          description: `<#${oldState.channelId}> → <#${newState.channelId}>`,
          fields: [{ name: "Usuário", value: userTag }],
        })
      );
    }

    // --- Server mute / unmute ---
    if (oldState.serverMute !== newState.serverMute) {
      await sendLog(
        guild,
        settings,
        "voice",
        buildLogEmbed({
          title: newState.serverMute ? "🔇 Server mute aplicado" : "🔊 Server mute removido",
          color: Colors.updated,
          fields: [{ name: "Usuário", value: userTag }],
        })
      );
    }

    // --- Server deafen / undeafen ---
    if (oldState.serverDeaf !== newState.serverDeaf) {
      await sendLog(
        guild,
        settings,
        "voice",
        buildLogEmbed({
          title: newState.serverDeaf ? "🔇 Server deafen aplicado" : "🔊 Server deafen removido",
          color: Colors.updated,
          fields: [{ name: "Usuário", value: userTag }],
        })
      );
    }
  },
};
