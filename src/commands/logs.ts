import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";
import { getGuildSettings } from "../database/guildSettings";
import { buildLogEmbed, Colors } from "../services/embedService";

function fmtChannel(id: string | null): string {
  return id ? `<#${id}>` : "*não configurado*";
}

const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Mostra quais canais estão configurados para cada categoria de log.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const settings = await getGuildSettings(interaction.guildId!);

    const embed = buildLogEmbed({
      title: "📋 Canais de log configurados",
      color: Colors.info,
      fields: [
        { name: "Logs de voz", value: fmtChannel(settings.voiceLogChannel), inline: true },
        { name: "Logs de mensagens", value: fmtChannel(settings.messageLogChannel), inline: true },
        { name: "Logs de membros", value: fmtChannel(settings.memberLogChannel), inline: true },
        { name: "Logs administrativos", value: fmtChannel(settings.adminLogChannel), inline: true },
        { name: "Segurança (fallback geral)", value: fmtChannel(settings.securityLogChannel), inline: true },
      ],
      footer: "Sem canal configurado, os logs vão automaticamente para #logs-seguranca (criado pelo bot se não existir).",
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
