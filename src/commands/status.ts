import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";
import { getGuildSettings } from "../database/guildSettings";
import { buildLogEmbed, Colors } from "../services/embedService";

function check(value: boolean): string {
  return value ? "✅" : "❌";
}

const command: Command = {
  data: new SlashCommandBuilder().setName("status").setDescription("Mostra o status atual do bot neste servidor."),

  async execute(interaction: ChatInputCommandInteraction) {
    const settings = await getGuildSettings(interaction.guildId!);
    const guild = interaction.guild!;
    const ping = Math.round(interaction.client.ws.ping);

    const embed = buildLogEmbed({
      title: "🛡️ SECURITY BOT — Status",
      color: Colors.info,
      description: [
        `**Status:** Online`,
        `**Ping:** ${ping}ms`,
        `**Servidor:** ${guild.name}`,
        `**Membros:** ${guild.memberCount}`,
        `**Monitoramento:** Ativo`,
      ].join("\n"),
      fields: [
        { name: "Voice Logs", value: check(!!settings.voiceLogChannel || !!settings.securityLogChannel), inline: true },
        { name: "Message Logs", value: check(!!settings.messageLogChannel || !!settings.securityLogChannel), inline: true },
        { name: "Member Logs", value: check(!!settings.memberLogChannel || !!settings.securityLogChannel), inline: true },
        { name: "Security Alerts", value: check(!!settings.securityLogChannel), inline: true },
        { name: "Welcome", value: check(settings.welcomeEnabled), inline: true },
        { name: "DM Welcome", value: check(settings.dmWelcomeEnabled), inline: true },
        { name: "Anti-Spam", value: check(settings.antiSpamEnabled), inline: true },
        { name: "Anti-Flood", value: check(settings.antiFloodEnabled), inline: true },
        { name: "Anti-Raid", value: check(settings.antiRaidEnabled), inline: true },
        { name: "Account Age Warning", value: check(settings.accountAgeWarningEnabled), inline: true },
      ],
    });

    await interaction.reply({ embeds: [embed] });
  },
};

export default command;
