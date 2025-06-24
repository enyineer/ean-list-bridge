import z from "zod/v4";
import { adapterBaseConfigSchema } from "../adapterBase";
import type { BotAdapter } from "./interface";

const telegramAdapterConfigSchema = adapterBaseConfigSchema.extend({
  botToken: z.string(),
  chatId: z.string(),
});

type TelegramAdapterConfig = z.infer<typeof telegramAdapterConfigSchema>;

export class TelegramAdapter implements BotAdapter<TelegramAdapterConfig> {
  start(adapterConfig: TelegramAdapterConfig): Promise<void> {
    throw new Error("Method not implemented.");
  }
  sendMessage(
    message: string,
    adapterConfig: TelegramAdapterConfig
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getAdapterName(): string {
    return "telegram";
  }
  getConfigDataSchema() {
    return telegramAdapterConfigSchema;
  }
}
