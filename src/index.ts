import "dotenv/config";
import { client } from "./client";
import { loadCommands } from "./handlers/loadCommands";
import { loadEvents } from "./handlers/loadEvents";
import { configureDatabase, disconnectDatabase } from "./database/prisma";

async function main() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN não definido. Copie .env.example para .env e preencha os valores.");
  }

  await configureDatabase();

  loadCommands(client);
  loadEvents(client);

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch((error) => {
  console.error("[index] Erro fatal ao iniciar o bot:", error);
  process.exit(1);
});

async function shutdown(signal: string) {
  console.log(`\n[index] Recebido ${signal}, encerrando com segurança...`);
  await disconnectDatabase();
  client.destroy();
  process.exit(0);
}

// Sem um listener de "error", o discord.js derruba o processo inteiro.
client.on("error", (error) => {
  console.error("[client] Erro do cliente Discord:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[index] Promise rejeitada sem tratamento:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[index] Exceção não capturada:", error);
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
