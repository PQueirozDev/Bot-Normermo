import { EmbedBuilder, ColorResolvable } from "discord.js";

export const Colors = {
  joined: 0x57f287, // verde
  left: 0xed4245, // vermelho
  updated: 0xfee75c, // amarelo
  alert: 0xf5a623, // laranja
  security: 0x992d22, // vermelho escuro
  info: 0x5865f2, // azul discord
} as const;

interface BaseEmbedOptions {
  title: string;
  description?: string;
  color?: ColorResolvable;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  thumbnail?: string;
}

/** Cria um embed padronizado usado em todos os logs do bot, com timestamp automático. */
export function buildLogEmbed(options: BaseEmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(options.title)
    .setColor(options.color ?? Colors.info)
    .setTimestamp();

  if (options.description) embed.setDescription(options.description);
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);

  return embed;
}
