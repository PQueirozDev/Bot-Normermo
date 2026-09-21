import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../types";
import { buildLogEmbed, Colors } from "../services/embedService";

const command: Command = {
  data: new SlashCommandBuilder().setName("help").setDescription("Mostra os comandos disponíveis do bot."),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = buildLogEmbed({
      title: "🛡️ Discord Security & Logging Bot — Ajuda",
      color: Colors.info,
      description: "Bot focado exclusivamente em segurança, monitoramento e logs.",
      fields: [
        { name: "/setup", value: "Configuração rápida: define um único canal para todos os logs." },
        {
          name: "/config",
          value:
            "Configura cada recurso individualmente: `welcome`, `leave`, `dm-welcome`, `voice-logs`, " +
            "`message-logs`, `member-logs`, `admin-logs`, `security-logs`, `anti-spam`, `anti-flood`, " +
            "`account-age`, `anti-raid`, `authorized-role`.",
        },
        { name: "/logs", value: "Mostra quais canais estão configurados para cada categoria." },
        { name: "/status", value: "Mostra o status geral do bot e dos módulos ativos." },
        { name: "/security", value: "Mostra um resumo detalhado das proteções de segurança." },
        { name: "/help", value: "Mostra esta mensagem." },
      ],
      footer: "Somente administradores ou cargos autorizados podem alterar configurações.",
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
