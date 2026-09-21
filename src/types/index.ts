import {
  ChatInputCommandInteraction,
  Collection,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: SlashCommandData;
  /** Se true, exige permissão de Administrador ou cargo autorizado configurado. */
  adminOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Extensão do client discord.js para carregar os comandos dinamicamente.
declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

export interface MessageLogCacheEntry {
  content: string;
  authorId: string;
  authorTag: string;
  channelId: string;
}
