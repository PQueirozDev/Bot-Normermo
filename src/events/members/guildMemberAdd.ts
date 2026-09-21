import { Events, GuildMember, TextChannel } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { applyPlaceholders } from "../../utils/placeholders";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { registerJoinAndCheckRaid, resetRaidCounter } from "../../services/antiRaidService";
import { formatRelativeAge } from "../../utils/time";

const ACCOUNT_AGE_MS_PER_DAY = 24 * 60 * 60 * 1000;

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    const settings = await getGuildSettings(member.guild.id);

    // --- 1. Mensagem automática de entrada no canal ---
    if (settings.welcomeEnabled && settings.welcomeChannel) {
      let channel = member.guild.channels.cache.get(settings.welcomeChannel);
      if (!channel) {
        channel = (await member.guild.channels.fetch(settings.welcomeChannel).catch(() => null)) ?? undefined;
      }
      if (channel?.isTextBased()) {
        const text = applyPlaceholders(
          settings.welcomeMessage ?? "👋 Bem-vindo, {user}!",
          member
        );
        try {
          if (settings.welcomeUseEmbed) {
            const embed = buildLogEmbed({ title: "👋 Novo membro", description: text, color: Colors.joined });
            await (channel as TextChannel).send({ embeds: [embed] });
          } else {
            await (channel as TextChannel).send({ content: text });
          }
        } catch (error) {
          console.error(`[guildMemberAdd] Falha ao enviar boas-vindas (guild ${member.guild.id}):`, error);
        }
      }
    }

    // --- 3. Mensagem automática no privado (opcional) ---
    if (settings.dmWelcomeEnabled) {
      const dmText = applyPlaceholders(
        settings.dmWelcomeMessage ?? "Olá, {username}! Bem-vindo ao {server}.",
        member
      );
      try {
        await member.send({ content: dmText });
      } catch {
        // Usuário com DMs bloqueadas: apenas registra, nunca tenta contornar a privacidade.
        await sendLog(
          member.guild,
          settings,
          "member",
          buildLogEmbed({
            title: "ℹ️ DM de boas-vindas não enviada",
            color: Colors.updated,
            description: `Não foi possível enviar DM para <@${member.id}> (DMs bloqueadas ou privacidade restrita).`,
          })
        );
      }
    }

    // --- 7. Log de entrada ---
    await sendLog(
      member.guild,
      settings,
      "member",
      buildLogEmbed({
        title: "🟢 Membro entrou",
        color: Colors.joined,
        fields: [
          { name: "Usuário", value: `${member.user.tag} (<@${member.id}>)`, inline: false },
          { name: "Conta criada", value: `${formatRelativeAge(member.user.createdAt)}`, inline: true },
          { name: "Membro nº", value: `${member.guild.memberCount}`, inline: true },
        ],
      })
    );

    // --- 11. Alerta de conta recém-criada ---
    if (settings.accountAgeWarningEnabled) {
      const ageMs = Date.now() - member.user.createdTimestamp;
      const thresholdMs = settings.accountAgeDays * ACCOUNT_AGE_MS_PER_DAY;

      if (ageMs < thresholdMs) {
        await sendLog(
          member.guild,
          settings,
          "security",
          buildLogEmbed({
            title: "⚠️ CONTA RECENTE",
            color: Colors.alert,
            description:
              `Usuário: <@${member.id}> (${member.user.tag})\n` +
              `Conta criada: ${formatRelativeAge(member.user.createdAt)}\n` +
              `Entrou agora no servidor.`,
            footer: "Alerta apenas — nenhuma ação automática foi tomada.",
          })
        );
      }
    }

    // --- 12. Detecção de entrada em massa (possível raid) ---
    if (settings.antiRaidEnabled) {
      const { isPossibleRaid, recentJoinCount } = registerJoinAndCheckRaid(
        member.guild.id,
        settings.antiRaidJoinThreshold,
        settings.antiRaidIntervalMs
      );

      if (isPossibleRaid) {
        await sendLog(
          member.guild,
          settings,
          "security",
          buildLogEmbed({
            title: "🚨 POSSÍVEL RAID",
            color: Colors.security,
            description:
              `${recentJoinCount} usuários entraram nos últimos ${settings.antiRaidIntervalMs / 1000}s.`,
            footer: "Nenhuma punição automática foi aplicada — revise manualmente.",
          })
        );
        resetRaidCounter(member.guild.id); // evita repetir o alerta a cada nova entrada do mesmo pico
      }
    }
  },
};
