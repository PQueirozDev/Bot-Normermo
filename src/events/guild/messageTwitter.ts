import { Events, Message } from "discord.js";

export default {
  name: Events.MessageCreate,

  async execute(message: Message) {
    if (message.author.bot) return;

    const xLinkRegex = /https?:\/\/(?:www\.)?x\.com\/\S+/i;

    if (!xLinkRegex.test(message.content)) return;

    await message.reply(
      "Para de postar hl q tu vai famoso nao seu bosta"
    );
  },
};
