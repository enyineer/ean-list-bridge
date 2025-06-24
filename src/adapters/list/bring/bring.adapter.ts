import type { Product } from "../../../product";
import { listAdapterBaseConfigSchema, type ListAdapter } from "../interface";
import { z } from "zod/v4";
import bringApi from "bring-shopping";
import { logger } from "../../../logger";

const bringAdapterConfigSchema = listAdapterBaseConfigSchema.extend({
  email: z.string(),
  password: z.string(),
  listId: z.string(),
});

type BringAdapterConfig = z.infer<typeof bringAdapterConfigSchema>;

class BringAdapter implements ListAdapter<BringAdapterConfig> {
  getAdapterName(): string {
    return "bring";
  }
  getConfigDataSchema() {
    return bringAdapterConfigSchema;
  }

  private async getApiInstance(adapterConfig: BringAdapterConfig) {
    // provide user and email to login
    const bring = new bringApi({
      mail: adapterConfig.email,
      password: adapterConfig.password,
    });

    // login to get your uuid and Bearer token
    try {
      await bring.login();
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`Error on Bring! API Login: ${e.message}`);
      }
      throw e;
    }

    return bring;
  }

  private getBringCompatibleProduct(product: Product) {
    return {
      name: product.name,
      specification: product.brand ?? product.extra ?? "",
    };
  }

  async addProduct(
    product: Product,
    adapterConfig: BringAdapterConfig
  ): Promise<void> {
    const api = await this.getApiInstance(adapterConfig);

    const { name, specification } = this.getBringCompatibleProduct(product);

    // Save product with product name and specification
    await api.saveItem(adapterConfig.listId, name, specification);
  }
  async hasProduct(
    product: Product,
    adapterConfig: BringAdapterConfig
  ): Promise<boolean> {
    const api = await this.getApiInstance(adapterConfig);

    const items = await api.getItems(adapterConfig.listId);

    const { name, specification } = this.getBringCompatibleProduct(product);

    const foundItem = items.purchase.find(
      (i) => i.name === name && i.specification === specification
    );

    return foundItem !== undefined;
  }
}

export default BringAdapter;
