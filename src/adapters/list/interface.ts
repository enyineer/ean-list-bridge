import { z } from "zod/v4";
import {
  adapterBaseConfigSchema,
  type AdapterBase,
  type AdapterBaseConfig,
} from "../interface";
import type { Product } from "../../product";

export const listAdapterBaseConfigSchema = adapterBaseConfigSchema.extend({});

export type ListAdapterBaseConfig = z.infer<typeof listAdapterBaseConfigSchema>;

export interface ListAdapter<C extends AdapterBaseConfig>
  extends AdapterBase<C> {
  /**
   * This is called whenever a product should be added to the list. The orchestrator will make sure that no duplicate entries are made.
   * @param product The product that should be addded.
   * @param adapterConfig The adapterConfig for a specific services ListAdapter.
   */
  addProduct(product: Product, adapterConfig: C): Promise<void>;
  /**
   * This is called whenever the orchestrator needs to check if a product already exists in a services defined list.
   * @param ean The ean to check for.
   * @param adapterConfig The adapterConfig for a specific services ListAdapter.
   */
  hasProduct(product: Product, adapterConfig: C): Promise<boolean>;
}
