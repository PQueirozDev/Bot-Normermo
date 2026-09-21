-- CreateTable
CREATE TABLE "GuildSettings" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeChannel" TEXT,
    "welcomeMessage" TEXT DEFAULT '👋 **Novo membro**

Bem-vindo, {user}!
Você é o membro número **{memberCount}** do servidor.',
    "welcomeUseEmbed" BOOLEAN NOT NULL DEFAULT true,
    "leaveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "leaveChannel" TEXT,
    "leaveMessage" TEXT DEFAULT '🚪 **Membro saiu**

**{username}** saiu do servidor.',
    "dmWelcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dmWelcomeMessage" TEXT DEFAULT 'Olá, {username}! 👋

Bem-vindo ao {server}.
Leia as regras antes de começar a conversar.',
    "voiceLogChannel" TEXT,
    "messageLogChannel" TEXT,
    "memberLogChannel" TEXT,
    "adminLogChannel" TEXT,
    "securityLogChannel" TEXT,
    "antiSpamEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiSpamMaxMessages" INTEGER NOT NULL DEFAULT 8,
    "antiSpamIntervalMs" INTEGER NOT NULL DEFAULT 5000,
    "antiSpamAutoPunish" BOOLEAN NOT NULL DEFAULT false,
    "antiFloodEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiFloodMaxRepeats" INTEGER NOT NULL DEFAULT 4,
    "antiFloodIntervalMs" INTEGER NOT NULL DEFAULT 15000,
    "accountAgeWarningEnabled" BOOLEAN NOT NULL DEFAULT false,
    "accountAgeDays" INTEGER NOT NULL DEFAULT 7,
    "antiRaidEnabled" BOOLEAN NOT NULL DEFAULT false,
    "antiRaidJoinThreshold" INTEGER NOT NULL DEFAULT 10,
    "antiRaidIntervalMs" INTEGER NOT NULL DEFAULT 20000,
    "authorizedRoleIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VoiceSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VoiceSession_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildSettings" ("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceSession_guildId_userId_key" ON "VoiceSession"("guildId", "userId");
