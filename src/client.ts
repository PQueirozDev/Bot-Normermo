import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";

/**
 * Intents necessários para todas as funcionalidades pedidas:
 * - Guilds: canais, cargos, informações básicas do servidor
 * - GuildMembers (privileged): entrada/saída, mudanças de nickname/cargo
 * - GuildMessages + MessageContent (privileged): logs de edição/exclusão, anti-spam/flood
 * - GuildVoiceStates: logs de call
 * - GuildModeration: ban/unban via evento nativo (redundante com audit log, mas explícito)
 * - DirectMessages: necessário para o envio de DM funcionar de forma confiável
 *
 * IMPORTANTE: GuildMembers e MessageContent são "Privileged Intents" e
 * precisam ser ativados manualmente no Discord Developer Portal
 * (Bot > Privileged Gateway Intents). Veja o README.
 */
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
