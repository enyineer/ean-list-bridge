import { adapterBaseConfigSchema } from "../adapterBase";
import type { Product } from "../product";
import { type SourceAdapter } from "./interface";
import { z } from "zod/v4";

const opengtinAdapterConfigSchema = adapterBaseConfigSchema.extend({
  userid: z.string(),
});

type OpengtinAdapterConfig = z.infer<typeof opengtinAdapterConfigSchema>;

class OpengtinAdapter implements SourceAdapter<OpengtinAdapterConfig> {
  getCacheTTL(): number {
    // Cache entries received from this source for 30 days
    return 30 * 24 * 60 * 60;
  }
  getAdapterName(): string {
    return "opengtin";
  }
  getConfigDataSchema() {
    return opengtinAdapterConfigSchema;
  }
  find(ean: string, adapterConfig: OpengtinAdapterConfig): Promise<Product> {
    throw new Error("Method not implemented.");
  }
}

module.exports = OpengtinAdapter;
