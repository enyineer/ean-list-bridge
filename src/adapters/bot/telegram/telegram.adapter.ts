import z from "zod/v4";
import {
  botAdapterBaseConfigSchema,
  type BotAdapter,
  type BotEvent,
  type BotUpdateFn,
} from "../interface";
import { Bot, Context } from "grammy";
import {
  Conversation,
  conversations,
  createConversation,
  type ConversationFlavor,
} from "@grammyjs/conversations";
import type { Product } from "../../../product";
import { logger } from "../../../logger";
import telegramifyMarkdown from "telegramify-markdown";

const telegramAdapterConfigSchema = botAdapterBaseConfigSchema.extend({
  botToken: z.string(),
});

type TelegramAdapterConfig = z.infer<typeof telegramAdapterConfigSchema>;

class TelegramAdapter implements BotAdapter<TelegramAdapterConfig> {
  private addCommandRegEx = new RegExp(/^\/add (\d{8,13})$/);

  getAddCommandExample(ean: string) {
    return `\`/add ${ean}\``;
  }

  async start(
    adapterConfig: TelegramAdapterConfig,
    onUpdate?: BotUpdateFn
  ): Promise<void> {
    const bot = new Bot<ConversationFlavor<Context>>(adapterConfig.botToken);

    bot.use(conversations());

    // Add middleware that checks if a message is actually allowed to be sent from this chat for the current service
    bot.use(async (ctx, next) => {
      if (!ctx.chatId) {
        return await ctx.reply("Did not receive a chatId for this message.");
      }

      if (ctx.chatId.toString() !== adapterConfig.chatId) {
        return await ctx.reply(
          `This chat \(\`${ctx.chatId}\`\) is not configured for this service\.`,
          { parse_mode: "MarkdownV2" }
        );
      }

      await next();
    });

    bot.command("start", async (ctx) => {
      if (onUpdate) {
        const event: BotEvent = {
          type: "start",
          chatId: ctx.chatId.toString(),
        };
        const returnVal = await onUpdate(event);
        if (returnVal !== null) {
          const telegramifiedMessage = telegramifyMarkdown(
            returnVal.message,
            "escape"
          );
          ctx.reply(telegramifiedMessage, { parse_mode: "MarkdownV2" });
        }
      }
    });

    async function addProduct(ctx: Context, product: Product) {
      if (!ctx.chatId) {
        return await ctx.reply(
          `Error: Did not receive a chatId for this chat.`
        );
      }

      if (onUpdate) {
        const event: BotEvent = {
          chatId: ctx.chatId.toString(),
          type: "add",
          data: {
            product,
          },
        };

        const returnVal = await onUpdate(event);

        if (returnVal !== null) {
          await ctx.reply(returnVal.message);
        }
      }
    }

    async function handleAddCommand(
      conversation: Conversation,
      ctx: Context,
      ean: string
    ) {
      await ctx.reply(
        `Hi there\\! Please tell me the product name for EAN \`${ean}\`, or say "stop" \\(without quotes\\) to exit\\.`,
        { parse_mode: "MarkdownV2" }
      );

      const { message: nameMessage } = await conversation.waitFor(
        "message:text"
      );

      if (nameMessage.text.toLowerCase() === "stop") {
        return ctx.reply(`Okay, exiting /add command.`);
      }

      const product: Product = {
        ean: ean,
        name: nameMessage.text,
        brand: null,
        extra: null,
      };

      await ctx.reply(
        `Allright, ${product.name} it is. Now send me the Brand of the product, or say "stop" (without quotes) to finish.`
      );

      const { message: brandMessage } = await conversation.waitFor(
        "message:text"
      );

      if (brandMessage.text.toLowerCase() === "stop") {
        return await addProduct(ctx, product);
      }

      product.brand = brandMessage.text;

      await ctx.reply(
        `Perfect, so ${product.name} is made by ${product.brand}. Now send me extra Info (like product size / amount) if you like, or say "stop" (without quotes) to finish.`
      );

      const { message: extraMessage } = await conversation.waitFor(
        "message:text"
      );

      if (extraMessage.text.toLowerCase() === "stop") {
        return await addProduct(ctx, product);
      }

      product.extra = extraMessage.text;

      return await addProduct(ctx, product);
    }
    bot.use(createConversation(handleAddCommand));

    bot.hears(this.addCommandRegEx, async (ctx) => {
      if (!ctx.message?.text) {
        // Exit conversation immediately if message is not existent
        return;
      }

      const matches = this.addCommandRegEx.exec(ctx.message.text);

      if (matches === null) {
        return;
      }

      const ean = matches[1];

      await ctx.conversation.enter("handleAddCommand", ean);
    });

    bot.catch((err) => logger.error(`Bot error: ${JSON.stringify(err)}`));

    bot.start();
  }
  async sendMessage(
    message: string,
    adapterConfig: TelegramAdapterConfig
  ): Promise<void> {
    const bot = new Bot(adapterConfig.botToken);
    const markdownMessage = telegramifyMarkdown(message, "escape");
    await bot.api.sendMessage(adapterConfig.chatId, markdownMessage, {
      parse_mode: "MarkdownV2",
    });
  }
  getAdapterName(): string {
    return "telegram";
  }
  getConfigDataSchema() {
    return telegramAdapterConfigSchema;
  }
}

export default TelegramAdapter;
