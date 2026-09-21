import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  GuildMember,
  Interaction,
  MessageFlags,
} from "discord.js";

import { isAuthorized } from "../../utils/permissions";

export default {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction) {

    // =========================================================
    // SLASH COMMANDS
    // =========================================================

    if (interaction.isChatInputCommand()) {
      if (!interaction.guild) {
        await interaction.reply({
          content: "Este bot so funciona dentro de servidores.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const command = interaction.client.commands.get(
        interaction.commandName
      );

      if (!command) return;

      if (command.adminOnly) {
        let member = interaction.member;

        if (!(member instanceof GuildMember)) {
          member = await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(() => null);
        }

        if (
          !member ||
          !(await isAuthorized(member as GuildMember))
        ) {
          await interaction.reply({
            content:
              "Voce nao tem permissao para usar este comando.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(
          `[interactionCreate] Erro ao executar /${interaction.commandName}:`,
          error
        );

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content:
              "Ocorreu um erro ao executar este comando.",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content:
              "Ocorreu um erro ao executar este comando.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      return;
    }

    // =========================================================
    // BOTOES DO PAINEL /cmds
    // =========================================================

    if (!interaction.isButton()) return;

    if (!interaction.guild) {
      await interaction.reply({
        content:
          "Este painel so funciona dentro de servidores.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    // Ignora botoes de outros sistemas do bot.
    if (!interaction.customId.startsWith("cmds_")) {
      return;
    }

    try {

      // -------------------------------------------------------
      // CONFIGURACAO
      // -------------------------------------------------------

      if (interaction.customId === "cmds_config") {

        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members
                .fetch(interaction.user.id)
                .catch(() => null);

        if (
          !member ||
          !(await isAuthorized(member))
        ) {
          await interaction.reply({
            content:
              "Voce nao tem permissao para acessar as configuracoes.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("Configuracao")
          .setDescription(
            [
              "Area de configuracao do Bot-Normermo.",
              "",
              "Em breve este menu permitira configurar:",
              "",
              "- Boas-vindas",
              "- Saida de membros",
              "- DM de boas-vindas",
              "- Logs de voz",
              "- Logs de mensagens",
              "- Logs de membros",
              "- Logs administrativos",
              "- Logs de seguranca",
              "- Cargo autorizado",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // -------------------------------------------------------
      // SEGURANCA
      // -------------------------------------------------------

      if (interaction.customId === "cmds_security") {

        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members
                .fetch(interaction.user.id)
                .catch(() => null);

        if (
          !member ||
          !(await isAuthorized(member))
        ) {
          await interaction.reply({
            content:
              "Voce nao tem permissao para acessar a seguranca.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("Seguranca")
          .setDescription(
            [
              "Central de seguranca do servidor.",
              "",
              "Protecoes disponiveis:",
              "",
              "- Anti-Spam",
              "- Anti-Flood",
              "- Anti-Raid",
              "- Verificacao de idade da conta",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // -------------------------------------------------------
      // LOGS
      // -------------------------------------------------------

      if (interaction.customId === "cmds_logs") {

        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members
                .fetch(interaction.user.id)
                .catch(() => null);

        if (
          !member ||
          !(await isAuthorized(member))
        ) {
          await interaction.reply({
            content:
              "Voce nao tem permissao para acessar os logs.",
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        const embed = new EmbedBuilder()
          .setTitle("Logs")
          .setDescription(
            [
              "Gerenciamento dos registros do servidor.",
              "",
              "Categorias:",
              "",
              "- Voz",
              "- Mensagens",
              "- Membros",
              "- Administracao",
              "- Seguranca",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // -------------------------------------------------------
      // STATUS
      // -------------------------------------------------------

      if (interaction.customId === "cmds_status") {

        const ping = interaction.client.ws.ping;

        const embed = new EmbedBuilder()
          .setTitle("Status do Bot-Normermo")
          .addFields(
            {
              name: "Status",
              value: "Online",
              inline: true,
            },
            {
              name: "Ping",
              value: `${ping}ms`,
              inline: true,
            },
            {
              name: "Servidor",
              value: interaction.guild.name,
              inline: true,
            },
            {
              name: "Membros",
              value: `${interaction.guild.memberCount}`,
              inline: true,
            }
          )
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // -------------------------------------------------------
      // UTILIDADES
      // -------------------------------------------------------

      if (interaction.customId === "cmds_utils") {

        const row =
          new ActionRowBuilder<ButtonBuilder>().addComponents(

            new ButtonBuilder()
              .setCustomId("cmds_util_avatar")
              .setLabel("Ver avatar")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("cmds_util_clear")
              .setLabel("Limpar mensagens")
              .setStyle(ButtonStyle.Danger)
          );

        const embed = new EmbedBuilder()
          .setTitle("Utilidades")
          .setDescription(
            "Escolha uma ferramenta abaixo."
          );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // -------------------------------------------------------
      // AJUDA
      // -------------------------------------------------------

      if (interaction.customId === "cmds_help") {

        const embed = new EmbedBuilder()
          .setTitle("Ajuda | Bot-Normermo")
          .setDescription(
            [
              "Voce pode utilizar este painel ou os slash commands.",
              "",
              "**Comandos:**",
              "`/setup` - configuracao inicial",
              "`/config` - configuracoes",
              "`/logs` - visualizar logs",
              "`/status` - status do bot",
              "`/security` - seguranca",
              "`/zoom` - visualizar avatar",
              "`/clear` - apagar mensagens",
              "`/help` - ajuda",
              "`/cmds` - publicar este painel",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // Os dois botoes serao implementados na proxima etapa.

      if (
        interaction.customId === "cmds_util_avatar" ||
        interaction.customId === "cmds_util_clear"
      ) {
        await interaction.reply({
          content:
            "Essa ferramenta sera ativada na proxima etapa.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

    } catch (error) {

      console.error(
        "[interactionCreate] Erro no painel /cmds:",
        error
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content:
            "Ocorreu um erro ao usar o painel.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content:
            "Ocorreu um erro ao usar o painel.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};