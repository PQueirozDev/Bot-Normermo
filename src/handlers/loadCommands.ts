import { readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "discord.js";
import { Command } from "../types";

/** Carrega todos os arquivos de src/commands e registra no client.commands. */
export function loadCommands(client: Client): void {
  const commandsPath = path.join(__dirname, "..", "commands");
  const commandFiles = readdirSync(commandsPath).filter(
    (f) => (f.endsWith(".ts") || f.endsWith(".js")) && !f.endsWith(".d.ts") && !f.endsWith(".map")
  );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const commandModule = require(filePath);
    const command: Command = commandModule.default ?? commandModule;

    if (!command?.data || !command?.execute) {
      console.warn(`[loadCommands] Arquivo ignorado (formato inválido): ${file}`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }

  console.log(`[loadCommands] ${client.commands.size} comando(s) carregado(s).`);
}
