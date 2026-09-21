import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types";
import { getAuthorizedRoleIds, getGuildSettings, updateGuildSettings } from "../database/guildSettings";
import { buildLogEmbed, Colors } from "../services/embedService";

const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configura os recursos do bot para este servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("welcome")
        .setDescription("Configura a mensagem de boas-vindas no canal.")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de boas-vindas").addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((o) =>
          o
            .setName("mensagem")
            .setDescription("Use {user} {username} {server} {memberCount} {accountCreated}")
        )
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
        .addBooleanOption((o) => o.setName("embed").setDescription("Enviar como embed (true) ou texto simples (false)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("leave")
        .setDescription("Configura a mensagem de saída no canal.")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de saída").addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((o) =>
          o.setName("mensagem").setDescription("Use {username} {server} {accountCreated}")
        )
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("dm-welcome")
        .setDescription("Configura a mensagem privada enviada a novos membros.")
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
        .addStringOption((o) =>
          o.setName("mensagem").setDescription("Use {username} {server}")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("voice-logs")
        .setDescription("Define o canal de logs de voz (entrar/sair/mudar de call).")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de logs de voz").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("message-logs")
        .setDescription("Define o canal de logs de mensagens (editadas/apagadas).")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de logs de mensagens").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("member-logs")
        .setDescription("Define o canal de logs de membros (entrou/saiu/cargo/nickname/ban).")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de logs de membros").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("admin-logs")
        .setDescription("Define o canal de logs administrativos (canais/cargos criados/alterados).")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de logs administrativos").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("security-logs")
        .setDescription("Define o canal geral de segurança (usado como fallback para as outras categorias).")
        .addChannelOption((o) =>
          o.setName("canal").setDescription("Canal de segurança").addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("anti-spam")
        .setDescription("Configura a detecção de spam (muitas mensagens em pouco tempo).")
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
        .addIntegerOption((o) =>
          o.setName("limite-mensagens").setDescription("Nº de mensagens para disparar alerta").setMinValue(2).setMaxValue(50)
        )
        .addIntegerOption((o) =>
          o.setName("intervalo-segundos").setDescription("Janela de tempo em segundos").setMinValue(1).setMaxValue(120)
        )
        .addBooleanOption((o) => o.setName("punicao-automatica").setDescription("Aplicar timeout automaticamente ao detectar spam"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("anti-flood")
        .setDescription("Configura a detecção de mensagens repetidas.")
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
        .addIntegerOption((o) =>
          o.setName("limite-repeticoes").setDescription("Nº de repetições para disparar alerta").setMinValue(2).setMaxValue(50)
        )
        .addIntegerOption((o) =>
          o.setName("intervalo-segundos").setDescription("Janela de tempo em segundos").setMinValue(1).setMaxValue(300)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("account-age")
        .setDescription("Configura o alerta de contas recém-criadas.")
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
        .addIntegerOption((o) =>
          o.setName("dias").setDescription("Alertar contas com menos de X dias").setMinValue(1).setMaxValue(365)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("anti-raid")
        .setDescription("Configura a detecção de entrada em massa (possível raid).")
        .addBooleanOption((o) => o.setName("ativado").setDescription("Ativar ou desativar"))
        .addIntegerOption((o) =>
          o.setName("limite-entradas").setDescription("Nº de entradas para disparar alerta").setMinValue(3).setMaxValue(200)
        )
        .addIntegerOption((o) =>
          o.setName("intervalo-segundos").setDescription("Janela de tempo em segundos").setMinValue(5).setMaxValue(600)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("authorized-role")
        .setDescription("Adiciona ou remove um cargo autorizado a usar comandos administrativos do bot.")
        .addStringOption((o) =>
          o
            .setName("acao")
            .setDescription("Adicionar ou remover")
            .setRequired(true)
            .addChoices({ name: "Adicionar", value: "add" }, { name: "Remover", value: "remove" })
        )
        .addRoleOption((o) => o.setName("cargo").setDescription("Cargo a autorizar/remover").setRequired(true))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    switch (sub) {
      case "welcome": {
        const channel = interaction.options.getChannel("canal");
        const message = interaction.options.getString("mensagem");
        const enabled = interaction.options.getBoolean("ativado");
        const useEmbed = interaction.options.getBoolean("embed");

        await updateGuildSettings(guildId, {
          ...(channel ? { welcomeChannel: channel.id } : {}),
          ...(message !== null ? { welcomeMessage: message } : {}),
          ...(enabled !== null ? { welcomeEnabled: enabled } : {}),
          ...(useEmbed !== null ? { welcomeUseEmbed: useEmbed } : {}),
        });
        break;
      }
      case "leave": {
        const channel = interaction.options.getChannel("canal");
        const message = interaction.options.getString("mensagem");
        const enabled = interaction.options.getBoolean("ativado");

        await updateGuildSettings(guildId, {
          ...(channel ? { leaveChannel: channel.id } : {}),
          ...(message !== null ? { leaveMessage: message } : {}),
          ...(enabled !== null ? { leaveEnabled: enabled } : {}),
        });
        break;
      }
      case "dm-welcome": {
        const enabled = interaction.options.getBoolean("ativado");
        const message = interaction.options.getString("mensagem");

        await updateGuildSettings(guildId, {
          ...(enabled !== null ? { dmWelcomeEnabled: enabled } : {}),
          ...(message !== null ? { dmWelcomeMessage: message } : {}),
        });
        break;
      }
      case "voice-logs":
        await updateGuildSettings(guildId, { voiceLogChannel: interaction.options.getChannel("canal", true).id });
        break;
      case "message-logs":
        await updateGuildSettings(guildId, { messageLogChannel: interaction.options.getChannel("canal", true).id });
        break;
      case "member-logs":
        await updateGuildSettings(guildId, { memberLogChannel: interaction.options.getChannel("canal", true).id });
        break;
      case "admin-logs":
        await updateGuildSettings(guildId, { adminLogChannel: interaction.options.getChannel("canal", true).id });
        break;
      case "security-logs":
        await updateGuildSettings(guildId, { securityLogChannel: interaction.options.getChannel("canal", true).id });
        break;
      case "anti-spam": {
        const enabled = interaction.options.getBoolean("ativado");
        const maxMessages = interaction.options.getInteger("limite-mensagens");
        const intervalSeconds = interaction.options.getInteger("intervalo-segundos");
        const autoPunish = interaction.options.getBoolean("punicao-automatica");

        await updateGuildSettings(guildId, {
          ...(enabled !== null ? { antiSpamEnabled: enabled } : {}),
          ...(maxMessages !== null ? { antiSpamMaxMessages: maxMessages } : {}),
          ...(intervalSeconds !== null ? { antiSpamIntervalMs: intervalSeconds * 1000 } : {}),
          ...(autoPunish !== null ? { antiSpamAutoPunish: autoPunish } : {}),
        });
        break;
      }
      case "anti-flood": {
        const enabled = interaction.options.getBoolean("ativado");
        const maxRepeats = interaction.options.getInteger("limite-repeticoes");
        const intervalSeconds = interaction.options.getInteger("intervalo-segundos");

        await updateGuildSettings(guildId, {
          ...(enabled !== null ? { antiFloodEnabled: enabled } : {}),
          ...(maxRepeats !== null ? { antiFloodMaxRepeats: maxRepeats } : {}),
          ...(intervalSeconds !== null ? { antiFloodIntervalMs: intervalSeconds * 1000 } : {}),
        });
        break;
      }
      case "account-age": {
        const enabled = interaction.options.getBoolean("ativado");
        const days = interaction.options.getInteger("dias");

        await updateGuildSettings(guildId, {
          ...(enabled !== null ? { accountAgeWarningEnabled: enabled } : {}),
          ...(days !== null ? { accountAgeDays: days } : {}),
        });
        break;
      }
      case "anti-raid": {
        const enabled = interaction.options.getBoolean("ativado");
        const threshold = interaction.options.getInteger("limite-entradas");
        const intervalSeconds = interaction.options.getInteger("intervalo-segundos");

        await updateGuildSettings(guildId, {
          ...(enabled !== null ? { antiRaidEnabled: enabled } : {}),
          ...(threshold !== null ? { antiRaidJoinThreshold: threshold } : {}),
          ...(intervalSeconds !== null ? { antiRaidIntervalMs: intervalSeconds * 1000 } : {}),
        });
        break;
      }
      case "authorized-role": {
        const action = interaction.options.getString("acao", true);
        const role = interaction.options.getRole("cargo", true);
        const settings = await getGuildSettings(guildId);
        const current = new Set(getAuthorizedRoleIds(settings));

        if (action === "add") current.add(role.id);
        else current.delete(role.id);

        await updateGuildSettings(guildId, { authorizedRoleIds: Array.from(current).join(",") });
        break;
      }
    }

    const updated = await getGuildSettings(guildId);
    let details = `Configuração do módulo \`${sub}\` atualizada com sucesso.`;
    const fields: { name: string; value: string; inline?: boolean }[] = [];

    switch (sub) {
      case "welcome":
        fields.push(
          { name: "Status", value: updated.welcomeEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Canal", value: updated.welcomeChannel ? `<#${updated.welcomeChannel}>` : "*Não configurado*", inline: true },
          { name: "Formato", value: updated.welcomeUseEmbed ? "Embed" : "Texto simples", inline: true },
          { name: "Mensagem", value: updated.welcomeMessage ?? "*Padrão*" }
        );
        break;
      case "leave":
        fields.push(
          { name: "Status", value: updated.leaveEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Canal", value: updated.leaveChannel ? `<#${updated.leaveChannel}>` : "*Não configurado*", inline: true },
          { name: "Mensagem", value: updated.leaveMessage ?? "*Padrão*" }
        );
        break;
      case "dm-welcome":
        fields.push(
          { name: "Status", value: updated.dmWelcomeEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Mensagem", value: updated.dmWelcomeMessage ?? "*Padrão*" }
        );
        break;
      case "voice-logs":
      case "message-logs":
      case "member-logs":
      case "admin-logs":
      case "security-logs":
        details = `Canal para **${sub}** atualizado para <#${interaction.options.getChannel("canal", true).id}>.`;
        break;
      case "anti-spam":
        fields.push(
          { name: "Status", value: updated.antiSpamEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Limite", value: `${updated.antiSpamMaxMessages} mensagens`, inline: true },
          { name: "Intervalo", value: `${updated.antiSpamIntervalMs / 1000}s`, inline: true },
          { name: "Punição automática", value: updated.antiSpamAutoPunish ? "Timeout 10m ✅" : "Desativada ❌", inline: true }
        );
        break;
      case "anti-flood":
        fields.push(
          { name: "Status", value: updated.antiFloodEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Repetições", value: `${updated.antiFloodMaxRepeats}`, inline: true },
          { name: "Intervalo", value: `${updated.antiFloodIntervalMs / 1000}s`, inline: true }
        );
        break;
      case "account-age":
        fields.push(
          { name: "Status", value: updated.accountAgeWarningEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Dias mínimos", value: `${updated.accountAgeDays} dia(s)`, inline: true }
        );
        break;
      case "anti-raid":
        fields.push(
          { name: "Status", value: updated.antiRaidEnabled ? "Ativado ✅" : "Desativado ❌", inline: true },
          { name: "Limite de entradas", value: `${updated.antiRaidJoinThreshold}`, inline: true },
          { name: "Intervalo", value: `${updated.antiRaidIntervalMs / 1000}s`, inline: true }
        );
        break;
      case "authorized-role": {
        const roles = getAuthorizedRoleIds(updated);
        fields.push({
          name: "Cargos autorizados",
          value: roles.length > 0 ? roles.map((id) => `<@&${id}>`).join(", ") : "*Apenas Administradores*",
        });
        break;
      }
    }

    const embed = buildLogEmbed({
      title: "✅ Configuração atualizada",
      color: Colors.info,
      description: details,
      fields: fields.length > 0 ? fields : undefined,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
