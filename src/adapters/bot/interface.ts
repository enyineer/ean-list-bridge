import z from "zod/v4";
import { adapterBaseConfigSchema, type AdapterBase } from "../interface";
import type { Product } from "../../product";

export const botAdapterBaseConfigSchema = adapterBaseConfigSchema.extend({
  chatId: z.string(),
});

export type BotAdapterBaseConfig = z.infer<typeof botAdapterBaseConfigSchema>;

export type BotStartEvent = {
  type: "start";
  chatId: string;
};

export type BotAddEvent = {
  type: "add";
  chatId: string;
  data: {
    product: Product;
  };
};

export type BotEvent = BotStartEvent | BotAddEvent;

export type BotEventResponse = {
  message: string;
};

export type BotUpdateFnReturnValue = Promise<null | BotEventResponse>;

export type BotUpdateFn = (event: BotEvent) => BotUpdateFnReturnValue;

export interface BotAdapter<C extends BotAdapterBaseConfig>
  extends AdapterBase<C> {
  /**
   * Should return an example command the user has to use to add a product
   */
  getAddCommandExample(ean: string): string;
  /**
   * Starts the bot (eg. start listening to incoming messges) and receive an onUpdate function that handles Bot events.
   * @param adapterConfig The adapterConfig for this specific bot.
   * @param onUpdate An event handler which should handle all bot events. Can return BotResponse if the bot should answer, this should be handled by the Bot adapter.
   */
  start(adapterConfig: C, onUpdate?: BotUpdateFn): Promise<void>;
  /**
   * Sends a message to the chatId that is configured in a specific BotAdapterBaseConfig.
   * @param message The message.
   * @param adapterConfig The adapterConfig for this specific bot.
   */
  sendMessage(message: string, adapterConfig: C): Promise<void>;
}
