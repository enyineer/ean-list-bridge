import { z } from "zod/v4";
import {
  adapterBaseConfigSchema,
  type AdapterBase,
  type AdapterBaseConfig,
} from "../interface";
import type { Product } from "../../product";

export const sourceAdapterBaseConfigSchema = adapterBaseConfigSchema.extend({});

export type SourceAdapterBaseConfig = z.infer<
  typeof sourceAdapterBaseConfigSchema
>;

export interface SourceAdapter<C extends AdapterBaseConfig>
  extends AdapterBase<C> {
  /**
   * Gives this adapters configured TTL for all cached entries.
   */
  getCacheTTL(): number;
  /**
   * This is called whenever the orchestrator needs to find a product for a specific EAN. The EAN will already be validated by the orchetrator.
   * @param ean A validated EAN.
   * @param adapterConfig The services specific AdapterConfig for the configured adapter.
   */
  find(ean: string, adapterConfig: C): Promise<Product | null>;
}
