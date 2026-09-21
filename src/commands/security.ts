import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";
import { getGuildSettings } from "../database/guildSettings";
import { buildLogEmbed, Colors } from "../services/embedService";

const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName("security")
    .setDescription("Mostra um resumo detalhado das proteções de segurança configuradas.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const s = await getGuildSettings(interaction.guildId!);

    const embed = buildLogEmbed({
      title: "🛡️ Resumo de Segurança",
      color: Colors.security,
      fields: [
        {
          name: "⚠️ Anti-Spam",
          value: s.antiSpamEnabled
            ? `Ativo — ${s.antiSpamMaxMessages} msgs / ${s.antiSpamIntervalMs / 1000}s | Punição automática: ${s.antiSpamAutoPunish ? "sim" : "não"}`
            : "Desativado",
        },
        {
          name: "⚠️ Anti-Flood",
          value: s.antiFloodEnabled
            ? `Ativo — ${s.antiFloodMaxRepeats} repetições / ${s.antiFloodIntervalMs / 1000}s`
            : "Desativado",
        },
        {
          name: "🚨 Anti-Raid",
          value: s.antiRaidEnabled
            ? `Ativo — ${s.antiRaidJoinThreshold} entradas / ${s.antiRaidIntervalMs / 1000}s`
            : "Desativado",
        },
        {
          name: "🕐 Conta recém-criada",
          value: s.accountAgeWarningEnabled ? `Ativo — alerta para contas com menos de ${s.accountAgeDays} dia(s)` : "Desativado",
        },
      ],
      footer: "Nenhuma punição automática além das configuradas explicitamente é aplicada.",
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
