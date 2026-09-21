import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types";
import { updateGuildSettings } from "../database/guildSettings";
import { buildLogEmbed, Colors } from "../services/embedService";

/**
 * Configuração rápida: define um único canal para todos os logs de uma vez
 * (requisito 13 — "Ou utilizar apenas um canal para tudo"). Para configurar
 * canais separados por categoria, usar /config.
 */
const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configuração rápida: define um canal único para todos os logs de segurança.")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal que receberá todos os logs (voz, mensagens, membros, admin, segurança)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel("canal", true);

    await updateGuildSettings(interaction.guildId!, {
      securityLogChannel: channel.id,
    });

    const embed = buildLogEmbed({
      title: "✅ Configuração inicial concluída",
      color: Colors.info,
      description:
        `Todos os logs (voz, mensagens, membros, administrativos e segurança) ` +
        `serão enviados para <#${channel.id}> até que canais específicos sejam ` +
        `definidos com \`/config\`.`,
      fields: [
        {
          name: "Próximos passos",
          value:
            "• Ative os recursos que quiser com `/config` (welcome, anti-spam, anti-raid...)\n" +
            "• Use `/status` para ver o que está ativo\n" +
            "• Use `/config voice-logs`, `/config message-logs` etc. para separar os canais",
        },
      ],
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
