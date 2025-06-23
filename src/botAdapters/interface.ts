import type { AdapterBase, AdapterBaseConfig } from "../adapterBase";

export interface BotAdapter<C extends AdapterBaseConfig>
  extends AdapterBase<C> {
  start(adapterConfig: C): Promise<void>;
  sendMessage(chatId: string, adapterConfig: C): Promise<void>;
}
