import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  Events,
  GuildMember,
  Interaction,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";

import { isAuthorized } from "../../utils/permissions";
import {
  getAuthorizedRoleIds,
  getGuildSettings,
  updateGuildSettings,
} from "../../database/guildSettings";

// ============================================================
// HELPERS
// ============================================================

async function getMember(interaction: Interaction) {
  if (!interaction.guild) return null;

  if (interaction.member instanceof GuildMember) {
    return interaction.member;
  }

  return interaction.guild.members
    .fetch(interaction.user.id)
    .catch(() => null);
}

async function checkAuthorized(interaction: Interaction) {
  const member = await getMember(interaction);

  if (!member) return false;

  return isAuthorized(member);
}

function estado(valor: boolean) {
  return valor ? "🟢 Ativado" : "🔴 Desativado";
}

function canal(id: string | null) {
  return id ? `<#${id}>` : "Nao configurado";
}

// ============================================================
// PAINEL CONFIGURACAO
// ============================================================

async function buildConfigPanel(guildId: string) {
  const settings = await getGuildSettings(guildId);

  const embed = new EmbedBuilder()
    .setTitle("⚙️ Configuracao")
    .setDescription(
      "Configure os principais recursos do Capivarudo."
    )
    .addFields(
      {
        name: "👋 Boas-vindas",
        value:
          `${estado(settings.welcomeEnabled)}\n` +
          `Canal: ${canal(settings.welcomeChannel)}`,
        inline: true,
      },
      {
        name: "🚪 Saida",
        value:
          `${estado(settings.leaveEnabled)}\n` +
          `Canal: ${canal(settings.leaveChannel)}`,
        inline: true,
      },
      {
        name: "💌 DM de boas-vindas",
        value: estado(settings.dmWelcomeEnabled),
        inline: true,
      },
      {
        name: "🎤 Logs de voz",
        value: canal(settings.voiceLogChannel),
        inline: true,
      },
      {
        name: "💬 Logs de mensagens",
        value: canal(settings.messageLogChannel),
        inline: true,
      },
      {
        name: "👥 Logs de membros",
        value: canal(settings.memberLogChannel),
        inline: true,
      },
      {
        name: "🛠️ Logs administrativos",
        value: canal(settings.adminLogChannel),
        inline: true,
      },
      {
        name: "🛡️ Logs de seguranca",
        value: canal(settings.securityLogChannel),
        inline: true,
      }
    )
    .setFooter({
      text: "As alteracoes sao salvas automaticamente.",
    });

  const row1 =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("cmds_toggle_welcome")
        .setLabel(
          settings.welcomeEnabled
            ? "Desativar boas-vindas"
            : "Ativar boas-vindas"
        )
        .setEmoji("👋")
        .setStyle(
          settings.welcomeEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId("cmds_toggle_leave")
        .setLabel(
          settings.leaveEnabled
            ? "Desativar saida"
            : "Ativar saida"
        )
        .setEmoji("🚪")
        .setStyle(
          settings.leaveEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId("cmds_toggle_dm")
        .setLabel(
          settings.dmWelcomeEnabled
            ? "Desativar DM"
            : "Ativar DM"
        )
        .setEmoji("💌")
        .setStyle(
          settings.dmWelcomeEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        )
    );

  const row2 =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("cmds_config_welcome_channel")
        .setLabel("Canal boas-vindas")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("cmds_config_leave_channel")
        .setLabel("Canal de saida")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("cmds_config_role")
        .setLabel("Cargo autorizado")
        .setStyle(ButtonStyle.Secondary)
    );

  const row3 =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("cmds_logs")
        .setLabel("Configurar logs")
        .setEmoji("📋")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cmds_security")
        .setLabel("Seguranca")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary)
    );

  return {
    embeds: [embed],
    components: [row1, row2, row3],
  };
}

// ============================================================
// PAINEL SEGURANCA
// ============================================================

async function buildSecurityPanel(guildId: string) {
  const settings = await getGuildSettings(guildId);

  const embed = new EmbedBuilder()
    .setTitle("🛡️ Seguranca")
    .setDescription(
      "Ative ou desative as protecoes do servidor."
    )
    .addFields(
      {
        name: "Anti-Spam",
        value:
          `${estado(settings.antiSpamEnabled)}\n` +
          `Limite: ${settings.antiSpamMaxMessages} mensagens / ` +
          `${settings.antiSpamIntervalMs / 1000}s`,
        inline: true,
      },
      {
        name: "Anti-Flood",
        value:
          `${estado(settings.antiFloodEnabled)}\n` +
          `Repeticoes: ${settings.antiFloodMaxRepeats}`,
        inline: true,
      },
      {
        name: "Anti-Raid",
        value:
          `${estado(settings.antiRaidEnabled)}\n` +
          `Limite: ${settings.antiRaidJoinThreshold} entradas / ` +
          `${settings.antiRaidIntervalMs / 1000}s`,
        inline: true,
      },
      {
        name: "Conta nova",
        value:
          `${estado(settings.accountAgeWarningEnabled)}\n` +
          `Aviso abaixo de ${settings.accountAgeDays} dias`,
        inline: true,
      },
      {
        name: "Punicao automatica Anti-Spam",
        value: estado(settings.antiSpamAutoPunish),
        inline: true,
      }
    )
    .setFooter({
      text: "Clique nos botoes para alterar as protecoes.",
    });

  const row =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("cmds_toggle_spam")
        .setLabel("Anti-Spam")
        .setStyle(
          settings.antiSpamEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId("cmds_toggle_flood")
        .setLabel("Anti-Flood")
        .setStyle(
          settings.antiFloodEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId("cmds_toggle_raid")
        .setLabel("Anti-Raid")
        .setStyle(
          settings.antiRaidEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId("cmds_toggle_age")
        .setLabel("Conta nova")
        .setStyle(
          settings.accountAgeWarningEnabled
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        ),

      new ButtonBuilder()
        .setCustomId("cmds_toggle_punish")
        .setLabel("Auto Punish")
        .setStyle(
          settings.antiSpamAutoPunish
            ? ButtonStyle.Danger
            : ButtonStyle.Success
        )
    );

  return {
    embeds: [embed],
    components: [row],
  };
}

// ============================================================
// PAINEL LOGS
// ============================================================

async function buildLogsPanel(guildId: string) {
  const settings = await getGuildSettings(guildId);

  const embed = new EmbedBuilder()
    .setTitle("📋 Logs")
    .setDescription(
      "Escolha qual categoria deseja configurar."
    )
    .addFields(
      {
        name: "🎤 Voz",
        value: canal(settings.voiceLogChannel),
        inline: true,
      },
      {
        name: "💬 Mensagens",
        value: canal(settings.messageLogChannel),
        inline: true,
      },
      {
        name: "👥 Membros",
        value: canal(settings.memberLogChannel),
        inline: true,
      },
      {
        name: "🛠️ Administracao",
        value: canal(settings.adminLogChannel),
        inline: true,
      },
      {
        name: "🛡️ Seguranca",
        value: canal(settings.securityLogChannel),
        inline: true,
      }
    );

  const row =
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("cmds_log_voice")
        .setLabel("Voz")
        .setEmoji("🎤")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cmds_log_message")
        .setLabel("Mensagens")
        .setEmoji("💬")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cmds_log_member")
        .setLabel("Membros")
        .setEmoji("👥")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cmds_log_admin")
        .setLabel("Administracao")
        .setEmoji("🛠️")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("cmds_log_security")
        .setLabel("Seguranca")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Secondary)
    );

  return {
    embeds: [embed],
    components: [row],
  };
}

// ============================================================
// EVENTO
// ============================================================

export default {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction) {
    // ========================================================
    // SLASH COMMANDS
    // ========================================================

    if (interaction.isChatInputCommand()) {
      if (!interaction.guild) {
        await interaction.reply({
          content:
            "Este bot so funciona dentro de servidores.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const command =
        interaction.client.commands.get(
          interaction.commandName
        );

      if (!command) return;

      if (command.adminOnly) {
        const member = await getMember(interaction);

        if (
          !member ||
          !(await isAuthorized(member))
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
          `[interactionCreate] Erro em /${interaction.commandName}:`,
          error
        );

        if (
          interaction.replied ||
          interaction.deferred
        ) {
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

    // ========================================================
    // SELETOR DE AVATAR
    // ========================================================

    if (
      interaction.isUserSelectMenu() &&
      interaction.customId ===
        "cmds_avatar_select"
    ) {
      const user = interaction.users.first();

      if (!user) return;

      const avatarUrl =
        user.displayAvatarURL({
          extension: "png",
          size: 4096,
        });

      const embed = new EmbedBuilder()
        .setTitle(`Avatar de ${user.username}`)
        .setDescription(
          `**Usuario:** <@${user.id}>\n` +
          `**Username:** ${user.username}\n` +
          `**ID:** ${user.id}`
        )
        .setImage(avatarUrl);

      const row =
        new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
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

    // ========================================================
    // SELECAO DE CANAL
    // ========================================================

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId.startsWith(
        "cmds_channel_"
      )
    ) {
      if (
        !interaction.guild ||
        !(await checkAuthorized(interaction))
      ) {
        await interaction.reply({
          content: "Sem permissao.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const channelId =
        interaction.values[0];

      const type =
        interaction.customId.replace(
          "cmds_channel_",
          ""
        );

      switch (type) {
        case "welcome":
          await updateGuildSettings(
            interaction.guild.id,
            { welcomeChannel: channelId }
          );
          break;

        case "leave":
          await updateGuildSettings(
            interaction.guild.id,
            { leaveChannel: channelId }
          );
          break;

        case "voice":
          await updateGuildSettings(
            interaction.guild.id,
            { voiceLogChannel: channelId }
          );
          break;

        case "message":
          await updateGuildSettings(
            interaction.guild.id,
            { messageLogChannel: channelId }
          );
          break;

        case "member":
          await updateGuildSettings(
            interaction.guild.id,
            { memberLogChannel: channelId }
          );
          break;

        case "admin":
          await updateGuildSettings(
            interaction.guild.id,
            { adminLogChannel: channelId }
          );
          break;

        case "security":
          await updateGuildSettings(
            interaction.guild.id,
            { securityLogChannel: channelId }
          );
          break;

        default:
          return;
      }

      await interaction.update({
        content:
          `✅ Canal configurado: <#${channelId}>`,
        components: [],
      });

      return;
    }

    // ========================================================
    // SELECAO DE CARGO AUTORIZADO
    // ========================================================

    if (
      interaction.isRoleSelectMenu() &&
      interaction.customId ===
        "cmds_role_authorized"
    ) {
      if (
        !interaction.guild ||
        !(await checkAuthorized(interaction))
      ) {
        await interaction.reply({
          content: "Sem permissao.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const roleId = interaction.values[0];

      const settings =
        await getGuildSettings(
          interaction.guild.id
        );

      const roles =
        getAuthorizedRoleIds(settings);

      if (!roles.includes(roleId)) {
        roles.push(roleId);
      }

      await updateGuildSettings(
        interaction.guild.id,
        {
          authorizedRoleIds:
            roles.join(","),
        }
      );

      await interaction.update({
        content:
          `✅ Cargo <@&${roleId}> autorizado.`,
        components: [],
      });

      return;
    }

    // ========================================================
    // MODAL CLEAR
    // ========================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId ===
        "cmds_clear_modal"
    ) {
      if (
        !interaction.guild ||
        !interaction.channel
      ) {
        return;
      }

      const member =
        await getMember(interaction);

      if (
        !member ||
        !member.permissions.has(
          PermissionFlagsBits.ManageMessages
        )
      ) {
        await interaction.reply({
          content:
            "Voce precisa da permissao Gerenciar Mensagens.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const value =
        interaction.fields
          .getTextInputValue(
            "cmds_clear_amount"
          )
          .trim();

      const amount = Number(value);

      if (
        !Number.isInteger(amount) ||
        amount < 1 ||
        amount > 100
      ) {
        await interaction.reply({
          content:
            "Digite um numero entre 1 e 100.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (
        !(interaction.channel instanceof TextChannel)
      ) {
        await interaction.reply({
          content:
            "Use esta ferramenta em um canal de texto.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const bot =
        interaction.guild.members.me;

      if (
        !bot ||
        !bot
          .permissionsIn(interaction.channel)
          .has(
            PermissionFlagsBits.ManageMessages
          )
      ) {
        await interaction.reply({
          content:
            "Eu nao tenho permissao para gerenciar mensagens neste canal.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      const deleted =
        await interaction.channel.bulkDelete(
          amount,
          true
        );

      let response =
        `🧹 ${deleted.size} mensagem(ns) apagadas.`;

      if (deleted.size < amount) {
        response +=
          "\nAlgumas mensagens tinham mais de 14 dias.";
      }

      await interaction.editReply(response);

      return;
    }

    // ========================================================
    // BOTOES
    // ========================================================

    if (!interaction.isButton()) return;

    if (
      !interaction.guild ||
      !interaction.customId.startsWith(
        "cmds_"
      )
    ) {
      return;
    }

    try {
      const id = interaction.customId;

      // ------------------------------------------------------
      // CONFIG
      // ------------------------------------------------------

      if (id === "cmds_config") {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const panel =
          await buildConfigPanel(
            interaction.guild.id
          );

        await interaction.reply({
          ...panel,
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // TOGGLES CONFIG
      // ------------------------------------------------------

      if (
        [
          "cmds_toggle_welcome",
          "cmds_toggle_leave",
          "cmds_toggle_dm",
        ].includes(id)
      ) {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const settings =
          await getGuildSettings(
            interaction.guild.id
          );

        if (
          id === "cmds_toggle_welcome"
        ) {
          await updateGuildSettings(
            interaction.guild.id,
            {
              welcomeEnabled:
                !settings.welcomeEnabled,
            }
          );
        }

        if (
          id === "cmds_toggle_leave"
        ) {
          await updateGuildSettings(
            interaction.guild.id,
            {
              leaveEnabled:
                !settings.leaveEnabled,
            }
          );
        }

        if (
          id === "cmds_toggle_dm"
        ) {
          await updateGuildSettings(
            interaction.guild.id,
            {
              dmWelcomeEnabled:
                !settings.dmWelcomeEnabled,
            }
          );
        }

        const panel =
          await buildConfigPanel(
            interaction.guild.id
          );

        await interaction.update(panel);

        return;
      }

      // ------------------------------------------------------
      // CANAL BOAS-VINDAS / SAIDA
      // ------------------------------------------------------

      if (
        id ===
          "cmds_config_welcome_channel" ||
        id ===
          "cmds_config_leave_channel"
      ) {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const type =
          id ===
          "cmds_config_welcome_channel"
            ? "welcome"
            : "leave";

        const select =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              `cmds_channel_${type}`
            )
            .setPlaceholder(
              "Escolha um canal"
            )
            .setChannelTypes(
              ChannelType.GuildText
            )
            .setMinValues(1)
            .setMaxValues(1);

        const row =
          new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(select);

        await interaction.reply({
          content:
            "Selecione o canal:",
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // CARGO AUTORIZADO
      // ------------------------------------------------------

      if (
        id === "cmds_config_role"
      ) {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const select =
          new RoleSelectMenuBuilder()
            .setCustomId(
              "cmds_role_authorized"
            )
            .setPlaceholder(
              "Escolha o cargo autorizado"
            )
            .setMinValues(1)
            .setMaxValues(1);

        const row =
          new ActionRowBuilder<RoleSelectMenuBuilder>()
            .addComponents(select);

        await interaction.reply({
          content:
            "Selecione o cargo que podera administrar o bot:",
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // SEGURANCA
      // ------------------------------------------------------

      if (id === "cmds_security") {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const panel =
          await buildSecurityPanel(
            interaction.guild.id
          );

        await interaction.reply({
          ...panel,
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // TOGGLES SEGURANCA
      // ------------------------------------------------------

      if (
        [
          "cmds_toggle_spam",
          "cmds_toggle_flood",
          "cmds_toggle_raid",
          "cmds_toggle_age",
          "cmds_toggle_punish",
        ].includes(id)
      ) {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const settings =
          await getGuildSettings(
            interaction.guild.id
          );

        if (id === "cmds_toggle_spam") {
          await updateGuildSettings(
            interaction.guild.id,
            {
              antiSpamEnabled:
                !settings.antiSpamEnabled,
            }
          );
        }

        if (id === "cmds_toggle_flood") {
          await updateGuildSettings(
            interaction.guild.id,
            {
              antiFloodEnabled:
                !settings.antiFloodEnabled,
            }
          );
        }

        if (id === "cmds_toggle_raid") {
          await updateGuildSettings(
            interaction.guild.id,
            {
              antiRaidEnabled:
                !settings.antiRaidEnabled,
            }
          );
        }

        if (id === "cmds_toggle_age") {
          await updateGuildSettings(
            interaction.guild.id,
            {
              accountAgeWarningEnabled:
                !settings.accountAgeWarningEnabled,
            }
          );
        }

        if (
          id === "cmds_toggle_punish"
        ) {
          await updateGuildSettings(
            interaction.guild.id,
            {
              antiSpamAutoPunish:
                !settings.antiSpamAutoPunish,
            }
          );
        }

        const panel =
          await buildSecurityPanel(
            interaction.guild.id
          );

        await interaction.update(panel);

        return;
      }

      // ------------------------------------------------------
      // LOGS
      // ------------------------------------------------------

      if (id === "cmds_logs") {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const panel =
          await buildLogsPanel(
            interaction.guild.id
          );

        await interaction.reply({
          ...panel,
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // ESCOLHER CANAL DE LOG
      // ------------------------------------------------------

      if (
        id.startsWith("cmds_log_")
      ) {
        if (
          !(await checkAuthorized(interaction))
        ) {
          await interaction.reply({
            content: "🚫 Sem permissao.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const type =
          id.replace("cmds_log_", "");

        const valid = [
          "voice",
          "message",
          "member",
          "admin",
          "security",
        ];

        if (!valid.includes(type)) return;

        const select =
          new ChannelSelectMenuBuilder()
            .setCustomId(
              `cmds_channel_${type}`
            )
            .setPlaceholder(
              "Escolha o canal de log"
            )
            .setChannelTypes(
              ChannelType.GuildText
            )
            .setMinValues(1)
            .setMaxValues(1);

        const row =
          new ActionRowBuilder<ChannelSelectMenuBuilder>()
            .addComponents(select);

        await interaction.reply({
          content:
            "Selecione o canal que recebera estes logs:",
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      if (id === "cmds_status") {
        const settings =
          await getGuildSettings(
            interaction.guild.id
          );

        const protections = [
          settings.antiSpamEnabled,
          settings.antiFloodEnabled,
          settings.antiRaidEnabled,
          settings.accountAgeWarningEnabled,
        ].filter(Boolean).length;

        const embed =
          new EmbedBuilder()
            .setTitle(
              "📊 Status do Capivarudo"
            )
            .addFields(
              {
                name: "Bot",
                value: "🟢 Online",
                inline: true,
              },
              {
                name: "Ping",
                value:
                  `${interaction.client.ws.ping}ms`,
                inline: true,
              },
              {
                name: "Servidor",
                value:
                  interaction.guild.name,
                inline: true,
              },
              {
                name: "Membros",
                value:
                  `${interaction.guild.memberCount}`,
                inline: true,
              },
              {
                name:
                  "Protecoes ativas",
                value:
                  `${protections}/4`,
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

      // ------------------------------------------------------
      // UTILIDADES
      // ------------------------------------------------------

      if (id === "cmds_utils") {
        const row =
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(
                  "cmds_util_avatar"
                )
                .setLabel("Ver avatar")
                .setEmoji("🔎")
                .setStyle(
                  ButtonStyle.Primary
                ),

              new ButtonBuilder()
                .setCustomId(
                  "cmds_util_clear"
                )
                .setLabel(
                  "Limpar mensagens"
                )
                .setEmoji("🧹")
                .setStyle(
                  ButtonStyle.Danger
                )
            );

        const embed =
          new EmbedBuilder()
            .setTitle("🔧 Utilidades")
            .setDescription(
              "Escolha uma ferramenta."
            );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // AVATAR
      // ------------------------------------------------------

      if (
        id === "cmds_util_avatar"
      ) {
        const select =
          new UserSelectMenuBuilder()
            .setCustomId(
              "cmds_avatar_select"
            )
            .setPlaceholder(
              "Selecione um usuario"
            )
            .setMinValues(1)
            .setMaxValues(1);

        const row =
          new ActionRowBuilder<UserSelectMenuBuilder>()
            .addComponents(select);

        await interaction.reply({
          content:
            "Selecione o usuario:",
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ------------------------------------------------------
      // CLEAR
      // ------------------------------------------------------

      if (
        id === "cmds_util_clear"
      ) {
        const member =
          await getMember(interaction);

        if (
          !member ||
          !member.permissions.has(
            PermissionFlagsBits.ManageMessages
          )
        ) {
          await interaction.reply({
            content:
              "🚫 Voce precisa da permissao Gerenciar Mensagens.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const input =
          new TextInputBuilder()
            .setCustomId(
              "cmds_clear_amount"
            )
            .setLabel(
              "Quantidade de mensagens"
            )
            .setPlaceholder(
              "Exemplo: 25"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3);

        const row =
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(input);

        const modal =
          new ModalBuilder()
            .setCustomId(
              "cmds_clear_modal"
            )
            .setTitle(
              "Limpar mensagens"
            )
            .addComponents(row);

        await interaction.showModal(
          modal
        );

        return;
      }

      // ------------------------------------------------------
      // AJUDA
      // ------------------------------------------------------

      if (id === "cmds_help") {
        const embed =
          new EmbedBuilder()
            .setTitle(
              "❓ Ajuda | Capivarudo"
            )
            .setDescription(
              [
                "Use o painel ou os slash commands.",
                "",
                "`/setup` - configuracao inicial",
                "`/config` - configuracoes avancadas",
                "`/logs` - canais de logs",
                "`/status` - status",
                "`/security` - seguranca",
                "`/zoom` - avatar",
                "`/clear` - limpar mensagens",
                "`/help` - ajuda",
                "`/cmds` - publicar painel",
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
        "[interactionCreate] Erro no painel:",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {
        await interaction.followUp({
          content:
            "❌ Ocorreu um erro ao usar o painel.",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content:
            "❌ Ocorreu um erro ao usar o painel.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
};