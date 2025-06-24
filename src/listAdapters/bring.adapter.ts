import { adapterBaseConfigSchema } from "../adapterBase";
import type { Product } from "../product";
import { type ListAdapter } from "./interface";
import { z } from "zod/v4";

const bringAdapterConfigSchema = adapterBaseConfigSchema.extend(
  z.object({
    username: z.string(),
    password: z.string(),
    listId: z.string(),
  })
);

type BringAdapterConfig = z.infer<typeof bringAdapterConfigSchema>;

class BringAdapter implements ListAdapter<BringAdapterConfig> {
  getAdapterName(): string {
    return "bring";
  }
  getConfigDataSchema() {
    return bringAdapterConfigSchema;
  }
  addProduct(
    product: Product,
    adapterConfig: BringAdapterConfig
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  hasProduct(ean: string, adapterConfig: BringAdapterConfig): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

module.exports = BringAdapter;
