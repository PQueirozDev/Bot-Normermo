import { AuditLogEvent, Events, GuildMember, PartialGuildMember, TextChannel } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { applyPlaceholders } from "../../utils/placeholders";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";
import { formatFullDate } from "../../utils/time";

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    const settings = await getGuildSettings(member.guild.id);
    const fullMember = member as GuildMember;

    // --- 2. Mensagem automática de saída no canal ---
    if (settings.leaveEnabled && settings.leaveChannel) {
      let channel = member.guild.channels.cache.get(settings.leaveChannel);
      if (!channel) {
        channel = (await member.guild.channels.fetch(settings.leaveChannel).catch(() => null)) ?? undefined;
      }
      if (channel?.isTextBased()) {
        const text = applyPlaceholders(
          settings.leaveMessage ?? "🚪 **{username}** saiu do servidor.",
          fullMember
        );
        try {
          await (channel as TextChannel).send({ content: text });
        } catch (error) {
          console.error(`[guildMemberRemove] Falha ao enviar mensagem de saída (guild ${member.guild.id}):`, error);
        }
      }
    }

    // Verifica nos Audit Logs se foi um kick (não há evento nativo específico para kick).
    const kickEntry = await findAuditLogResponsible(member.guild, AuditLogEvent.MemberKick, member.id);

    // --- 7. Log de saída ---
    await sendLog(
      member.guild,
      settings,
      "member",
      buildLogEmbed({
        title: kickEntry ? "🔴 Membro expulso (kick)" : "🔴 Membro saiu",
        color: Colors.left,
        fields: [
          { name: "Usuário", value: `${member.user?.tag ?? "desconhecido"} (<@${member.id}>)` },
          { name: "Conta criada em", value: member.user ? formatFullDate(member.user.createdAt) : "N/A", inline: true },
          {
            name: "Entrou no servidor em",
            value: fullMember.joinedAt ? formatFullDate(fullMember.joinedAt) : "N/A",
            inline: true,
          },
          { name: "Saiu em", value: formatFullDate(new Date()), inline: true },
          ...(kickEntry ? [{ name: "Responsável pelo kick", value: formatResponsible(kickEntry) }] : []),
        ],
      })
    );
  },
};
