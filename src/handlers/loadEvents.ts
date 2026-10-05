import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Client } from "discord.js";

interface EventModule {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => unknown;
}

/** Varre recursivamente src/events (e subpastas members/voice/messages/security) e registra tudo. */
export function loadEvents(client: Client): void {
  const eventsPath = path.join(__dirname, "..", "events");
  let count = 0;

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath);
        continue;
      }
      if ((!entry.endsWith(".ts") && !entry.endsWith(".js")) || entry.endsWith(".d.ts") || entry.endsWith(".map")) continue;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const eventModule = require(fullPath);
      const event: EventModule = eventModule.default ?? eventModule;

      if (!event?.name || !event?.execute) {
        console.warn(`[loadEvents] Arquivo ignorado (formato inválido): ${fullPath}`);
        continue;
      }

      // Envolve cada handler: um erro (ex.: timeout do banco) é logado em vez de derrubar o processo.
      const safeExecute = async (...args: unknown[]) => {
        try {
          await event.execute(...args);
        } catch (error) {
          console.error(`[event:${event.name}] Erro ao executar handler (${entry}):`, error);
        }
      };

      if (event.once) {
        client.once(event.name, safeExecute);
      } else {
        client.on(event.name, safeExecute);
      }
      count++;
    }
  }

  walk(eventsPath);
  console.log(`[loadEvents] ${count} handler(es) de evento carregado(s).`);
}
