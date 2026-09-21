import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../types";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("zoom")
    .setDescription("Mostra o avatar de um usuário em tamanho grande.")
    .addUserOption((option) =>
      option
        .setName("usuario")
        .setDescription("Usuário que você quer ver.")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser("usuario", true);
    const avatarUrl = user.displayAvatarURL({
      extension: "png",
      size: 4096,
    });

    const embed = new EmbedBuilder()
      .setTitle(`🔎 Avatar de ${user.username}`)
      .setDescription(
        `**Usuário:** <@${user.id}>` +
        `\n**Username:** ${user.username}`
      )
      .setImage(avatarUrl)
      .setFooter({ text: `ID: ${user.id}` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Abrir avatar original")
        .setStyle(ButtonStyle.Link)
        .setURL(avatarUrl)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};

export default command;
