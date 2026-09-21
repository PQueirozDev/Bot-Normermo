import { Events, GuildMember, Interaction } from "discord.js";
import { isAuthorized } from "../../utils/permissions";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guild) {
      await interaction.reply({ content: "Este bot só funciona dentro de servidores.", ephemeral: true });
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    // Validação de permissão feita no próprio bot, independente da visibilidade
    // do comando na UI do Discord (requisito 16).
    if (command.adminOnly) {
      let member = interaction.member;
      if (!(member instanceof GuildMember) && interaction.guild) {
        member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      }
      if (!member || !(await isAuthorized(member as GuildMember))) {
        await interaction.reply({
          content: "🚫 Você não tem permissão para usar este comando.",
          ephemeral: true,
        });
        return;
      }
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[interactionCreate] Erro ao executar /${interaction.commandName}:`, error);
      const payload = { content: "❌ Ocorreu um erro ao executar este comando.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  },
};
