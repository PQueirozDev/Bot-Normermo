import "dotenv/config";
import { client } from "./client";
import { loadCommands } from "./handlers/loadCommands";
import { loadEvents } from "./handlers/loadEvents";
import { disconnectDatabase } from "./database/prisma";

async function main() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN não definido. Copie .env.example para .env e preencha os valores.");
  }

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

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
