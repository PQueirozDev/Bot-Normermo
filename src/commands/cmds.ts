import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
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
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("BOT-NORMERMO | Central de Comandos")
      .setDescription(
        [
          "Use os botoes abaixo para acessar as funcoes do bot.",
          "",
          "**Configuracao** - recursos gerais do servidor",
          "**Seguranca** - protecoes e monitoramento",
          "**Logs** - configuracao dos registros",
          "**Status** - informacoes do bot",
          "**Utilidades** - ferramentas rapidas",
          "**Ajuda** - comandos disponiveis",
          "",
          "Os comandos tradicionais com `/` continuam funcionando.",
        ].join("\n")
      )
      .setFooter({
        text: "Bot-Normermo | Painel de gerenciamento",
      })
      .setTimestamp();

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

    await interaction.channel.send({
      embeds: [embed],
      components: [primeiraLinha, segundaLinha],
    });

    await interaction.reply({
      content: "Painel criado com sucesso neste canal.",
      ephemeral: true,
    });
  },
};

export default command;