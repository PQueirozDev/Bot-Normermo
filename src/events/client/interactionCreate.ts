import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  GuildMember,
  Interaction,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
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
    // SELETOR DE USUARIO - VER AVATAR
    // =========================================================

    if (
      interaction.isUserSelectMenu() &&
      interaction.customId === "cmds_avatar_select"
    ) {
      const user = interaction.users.first();

      if (!user) {
        await interaction.reply({
          content: "Nao foi possivel encontrar esse usuario.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const avatarUrl = user.displayAvatarURL({
        extension: "png",
        size: 4096,
      });

      const embed = new EmbedBuilder()
        .setTitle(`Avatar de ${user.username}`)
        .setDescription(
          [
            `**Usuario:** <@${user.id}>`,
            `**Username:** ${user.username}`,
            `**ID:** ${user.id}`,
          ].join("\n")
        )
        .setImage(avatarUrl);

      const row =
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("Abrir avatar original")
            .setStyle(ButtonStyle.Link)
            .setURL(avatarUrl)
        );

      await interaction.update({
        content: "",
        embeds: [embed],
        components: [row],
      });

      return;
    }

    // =========================================================
    // MODAL - LIMPAR MENSAGENS
    // =========================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === "cmds_clear_modal"
    ) {
      if (!interaction.guild || !interaction.channel) {
        await interaction.reply({
          content:
            "Este recurso so funciona dentro de um servidor.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const member =
        interaction.member instanceof GuildMember
          ? interaction.member
          : await interaction.guild.members
              .fetch(interaction.user.id)
              .catch(() => null);

      if (
        !member ||
        !member.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        await interaction.reply({
          content:
            "Voce precisa da permissao Gerenciar Mensagens para usar esta ferramenta.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const quantidadeTexto =
        interaction.fields
          .getTextInputValue("cmds_clear_amount")
          .trim();

      const quantidade = Number(quantidadeTexto);

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > 100
      ) {
        await interaction.reply({
          content:
            "Digite uma quantidade valida entre 1 e 100.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (!(interaction.channel instanceof TextChannel)) {
        await interaction.reply({
          content:
            "A limpeza so pode ser usada em um canal de texto.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const botMember = interaction.guild.members.me;

      if (
        !botMember ||
        !botMember
          .permissionsIn(interaction.channel)
          .has(PermissionFlagsBits.ManageMessages)
      ) {
        await interaction.reply({
          content:
            "Eu preciso da permissao Gerenciar Mensagens neste canal.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      try {
        const deleted =
          await interaction.channel.bulkDelete(
            quantidade,
            true
          );

        let resposta =
          `${deleted.size} mensagem(ns) foram apagadas.`;

        if (deleted.size < quantidade) {
          resposta +=
            "\nAlgumas mensagens podem ter mais de 14 dias e nao podem ser apagadas em massa pelo Discord.";
        }

        await interaction.editReply(resposta);
      } catch (error) {
        console.error(
          "[cmds_clear] Erro ao apagar mensagens:",
          error
        );

        await interaction.editReply(
          "Nao consegui apagar as mensagens. Verifique minhas permissoes neste canal."
        );
      }

      return;
    }

    // =========================================================
    // BOTOES DO PAINEL
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

    // Ignora botoes pertencentes a outros sistemas do bot.
    if (!interaction.customId.startsWith("cmds_")) {
      return;
    }

    try {
      // =======================================================
      // CONFIGURACAO
      // =======================================================

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
              "Recursos:",
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
              "",
              "Os controles individuais serao adicionados ao painel.",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // =======================================================
      // SEGURANCA
      // =======================================================

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
              "",
              "Os controles individuais serao adicionados ao painel.",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // =======================================================
      // LOGS
      // =======================================================

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

      // =======================================================
      // STATUS
      // =======================================================

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

      // =======================================================
      // UTILIDADES
      // =======================================================

      if (interaction.customId === "cmds_utils") {
        const row =
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId("cmds_util_avatar")
              .setLabel("Ver avatar")
              .setEmoji("🔎")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("cmds_util_clear")
              .setLabel("Limpar mensagens")
              .setEmoji("🧹")
              .setStyle(ButtonStyle.Danger)
          );

        const embed = new EmbedBuilder()
          .setTitle("Utilidades")
          .setDescription(
            [
              "Escolha uma ferramenta abaixo.",
              "",
              "**Ver avatar** - mostra o avatar de qualquer usuario.",
              "**Limpar mensagens** - remove de 1 a 100 mensagens recentes.",
            ].join("\n")
          );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // =======================================================
      // VER AVATAR
      // =======================================================

      if (interaction.customId === "cmds_util_avatar") {
        const seletor =
          new UserSelectMenuBuilder()
            .setCustomId("cmds_avatar_select")
            .setPlaceholder(
              "Selecione um usuario"
            )
            .setMinValues(1)
            .setMaxValues(1);

        const row =
          new ActionRowBuilder<UserSelectMenuBuilder>()
            .addComponents(seletor);

        await interaction.reply({
          content:
            "Selecione o usuario que deseja visualizar:",
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // =======================================================
      // LIMPAR MENSAGENS
      // =======================================================

      if (interaction.customId === "cmds_util_clear") {
        const member =
          interaction.member instanceof GuildMember
            ? interaction.member
            : await interaction.guild.members
                .fetch(interaction.user.id)
                .catch(() => null);

        if (
          !member ||
          !member.permissions.has(
            PermissionFlagsBits.ManageMessages
          )
        ) {
          await interaction.reply({
            content:
              "Voce precisa da permissao Gerenciar Mensagens para usar esta ferramenta.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const input =
          new TextInputBuilder()
            .setCustomId("cmds_clear_amount")
            .setLabel("Quantidade de mensagens")
            .setPlaceholder("Exemplo: 25")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3);

        const row =
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(input);

        const modal =
          new ModalBuilder()
            .setCustomId("cmds_clear_modal")
            .setTitle("Limpar mensagens")
            .addComponents(row);

        await interaction.showModal(modal);

        return;
      }

      // =======================================================
      // AJUDA
      // =======================================================

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