# Deploy no Railway — Capivarudo Security

## Variáveis do Service

Configure no Railway, sem colocar o token no GitHub:

- `DISCORD_TOKEN` — token NOVO do bot no Discord Developer Portal.
- `CLIENT_ID` — Application ID da aplicação.
- `DEV_GUILD_ID` — ID do servidor onde os slash commands serão registrados durante a configuração.
- `DATABASE_URL` — `file:/app/data/database.db`

## Volume persistente

Crie um Volume no service e monte em:

`/app/data`

Isso preserva o SQLite entre deploys/restarts.

## Build e inicialização

O `railway.json` já configura:

- Build: `npm run railway:build`
- Start: `npm run railway:start`

O start aplica as migrations do Prisma antes de iniciar o bot.

## Slash commands

Na primeira configuração (ou quando comandos mudarem), rode no Railway Shell:

`npm run deploy-commands`

Com `DEV_GUILD_ID` definido, os comandos são registrados diretamente nesse servidor.

## Intents no Discord Developer Portal

Ative em Bot > Privileged Gateway Intents:

- SERVER MEMBERS INTENT
- MESSAGE CONTENT INTENT

## Depois do deploy

No Discord, use `/setup` para definir o canal de logs e depois `/config` para ajustar os módulos.
