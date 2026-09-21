import { ActivityType, Client, Events } from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    console.log(`[ready] Logado como ${client.user.tag} — monitorando ${client.guilds.cache.size} servidor(es).`);
    // Status personalizado: aparece exatamente o texto, sem prefixo "Jogando/Assistindo".
    client.user.setPresence({
      status: "online",
      activities: [{ name: "Xeid odijao", type: ActivityType.Custom, state: "Xeid odijao" }],
    });
  },
};
