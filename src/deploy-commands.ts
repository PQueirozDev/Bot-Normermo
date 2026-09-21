import "dotenv/config";
import { readdirSync } from "node:fs";
import path from "node:path";
import { REST, Routes } from "discord.js";
import { Command } from "./types";

/**
 * Registra (ou atualiza) todos os slash commands na API do Discord.
 * Rode com `npm run deploy-commands` sempre que adicionar/alterar um comando.
 *
 * Se DEV_GUILD_ID estiver definido no .env, registra apenas nesse servidor
 * (propagação instantânea — ideal durante o desenvolvimento). Caso contrário,
 * registra globalmente (pode levar até 1h para propagar em todos os servidores).
 */
async function deployCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const devGuildId = process.env.DEV_GUILD_ID;

  if (!token || !clientId) {
    throw new Error("DISCORD_TOKEN e CLIENT_ID precisam estar definidos no .env.");
  }

  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = readdirSync(commandsPath).filter(
    (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts") && !f.endsWith(".map")
  );

  const commandsJson: unknown[] = [];
  for (const file of commandFiles) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const commandModule = require(path.join(commandsPath, file));
    const command: Command = commandModule.default ?? commandModule;
    if (command?.data?.toJSON) {
      commandsJson.push(command.data.toJSON());
    }
  }

  const rest = new REST().setToken(token);

  const route = devGuildId ? Routes.applicationGuildCommands(clientId, devGuildId) : Routes.applicationCommands(clientId);

  console.log(
    `[deploy-commands] Registrando ${commandsJson.length} comando(s) ${devGuildId ? `no servidor ${devGuildId}` : "globalmente"}...`
  );

  await rest.put(route, { body: commandsJson });

  console.log("[deploy-commands] Comandos registrados com sucesso.");
}

deployCommands().catch((error) => {
  console.error("[deploy-commands] Falha ao registrar comandos:", error);
  process.exit(1);
});
