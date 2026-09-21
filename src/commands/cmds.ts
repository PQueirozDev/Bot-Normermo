import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Command } from "../types";

const command: Command = {
  adminOnly: true,

  data: new SlashCommandBuilder()
    .setName("cmds")
    .setDescription("Publica a central interativa de comandos do bot.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (
      !interaction.channel ||
      !interaction.channel.isTextBased() ||
      !("send" in interaction.channel)
    ) {
      await interaction.reply({
        content: "Nao consigo criar o painel neste canal.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // =========================================================
    // PAINEL PRINCIPAL
    // =========================================================

    const embed = new EmbedBuilder()
      .setTitle("BOT-NORMERMO | Central de Comandos")
      .setDescription(
        [
          "Use os botoes abaixo para acessar as funcoes do bot.",
          "",
          "⚙️ **Configuracao**",
          "Configure os principais recursos do servidor.",
          "",
          "🛡️ **Seguranca**",
          "Gerencie as protecoes e o monitoramento.",
          "",
          "📋 **Logs**",
          "Visualize e configure os registros do servidor.",
          "",
          "📊 **Status**",
          "Veja informacoes sobre o bot e o servidor.",
          "",
          "🔧 **Utilidades**",
          "Acesse ferramentas como avatar e limpeza de mensagens.",
          "",
          "❓ **Ajuda**",
          "Veja os comandos e recursos disponiveis.",
          "",
          "Os comandos tradicionais com `/` continuam funcionando.",
        ].join("\n")
      )
      .setFooter({
        text: "Bot-Normermo | Painel de gerenciamento",
      })
      .setTimestamp();

    // =========================================================
    // PRIMEIRA LINHA
    // =========================================================

    const primeiraLinha =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("cmds_config")
          .setLabel("Configuracao")
          .setEmoji("⚙️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("cmds_security")
          .setLabel("Seguranca")
          .setEmoji("🛡️")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("cmds_logs")
          .setLabel("Logs")
          .setEmoji("📋")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("cmds_status")
          .setLabel("Status")
          .setEmoji("📊")
          .setStyle(ButtonStyle.Success)
      );

    // =========================================================
    // SEGUNDA LINHA
    // =========================================================

    const segundaLinha =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("cmds_utils")
          .setLabel("Utilidades")
          .setEmoji("🔧")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("cmds_help")
          .setLabel("Ajuda")
          .setEmoji("❓")
          .setStyle(ButtonStyle.Secondary)
      );

    // =========================================================
    // PUBLICA O PAINEL
    // =========================================================

    await interaction.channel.send({
      embeds: [embed],
      components: [primeiraLinha, segundaLinha],
    });

    // Somente o administrador que executou /cmds ve isso.
    await interaction.reply({
      content: "Painel criado com sucesso neste canal.",
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;