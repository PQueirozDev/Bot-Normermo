import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { Command } from "../types";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Apaga mensagens recentes deste canal.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("quantidade")
        .setDescription("Quantidade de mensagens para apagar (1 a 100).")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild() || !interaction.channel) {
      await interaction.reply({
        content: "❌ Este comando só pode ser usado em um servidor.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.ManageMessages
      )
    ) {
      await interaction.reply({
        content:
          "❌ Você precisa da permissão **Gerenciar Mensagens** para usar este comando.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const me = interaction.guild?.members.me;

    if (
      !me?.permissionsIn(interaction.channel).has(
        PermissionFlagsBits.ManageMessages
      )
    ) {
      await interaction.reply({
        content:
          "❌ Eu preciso da permissão **Gerenciar Mensagens** neste canal.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.channel;

    if (!(channel instanceof TextChannel)) {
      await interaction.reply({
        content:
          "❌ Este comando só pode ser usado em canais de texto.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const quantidade =
      interaction.options.getInteger("quantidade", true);

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const deleted = await channel.bulkDelete(quantidade, true);

      let mensagem =
        `🧹 **${deleted.size}** mensagem(ns) foram apagadas.`;

      if (deleted.size < quantidade) {
        mensagem +=
          "\n⚠️ Algumas mensagens podem ter mais de 14 dias e não podem ser apagadas em massa pelo Discord.";
      }

      await interaction.editReply(mensagem);
    } catch (error) {
      console.error("[clear] Erro ao apagar mensagens:", error);

      await interaction.editReply(
        "❌ Não consegui apagar as mensagens. Confira minhas permissões neste canal."
      );
    }
  },
};

export default command;
