import { logger } from "../../../logger";
import type { Product } from "../../../product";
import {
  sourceAdapterBaseConfigSchema,
  type SourceAdapter,
} from "../interface";
import { z } from "zod/v4";

const opengtinAdapterConfigSchema = sourceAdapterBaseConfigSchema.extend({
  userid: z.string(),
});

type OpengtindbAdapterConfig = z.infer<typeof opengtinAdapterConfigSchema>;

class OpengtindbAdapter implements SourceAdapter<OpengtindbAdapterConfig> {
  getCacheTTL(): number {
    // Cache entries received from this source for 30 days
    return 30 * 24 * 60 * 60;
  }
  getAdapterName(): string {
    return "opengtindb";
  }
  getConfigDataSchema() {
    return opengtinAdapterConfigSchema;
  }
  async find(
    ean: string,
    adapterConfig: OpengtindbAdapterConfig
  ): Promise<Product | null> {
    const response = await fetch(
      `https://opengtindb.org/?ean=${ean}&cmd=query&queryid=${adapterConfig.userid}`
    );

    const raw = await response.text();

    // Split into blocks wherever you see a line that's exactly '---'
    const blocks = raw
      .split(/^[ \t]*---[ \t]*$/m) // split on lines with only '---'
      .map((b) => b.trim()) // trim whitespace
      .filter(Boolean); // drop any empty blocks

    // The first block is just the error code
    const errorBlock = Object.fromEntries(
      blocks[0]!.split(/\r?\n/).map((line) => line.split(/=(.+)/).slice(0, 2))
    );

    // Product not found, but request was ok
    if (errorBlock.error === "1") {
      return null;
    }

    if (errorBlock.error !== "0") {
      throw new Error(
        `OpenGTINDB Response reported error: ${errorBlock.error} for ean ${ean} and userid ${adapterConfig.userid}`
      );
    }

    // Parse all the remaining blocks as products
    const products = blocks
      .slice(1) // drop the error block
      .map((block) => {
        const obj: Record<string, string> = {};
        for (const line of block.split(/\r?\n/)) {
          // split on the first '=' only
          const [key, value] = line.split(/=(.+)/).slice(0, 2);
          obj[key!] = value?.trim() ?? "";
        }
        return obj;
      });

    // Products can beempty even though error is 0! This is not according to OpenGTINDB's documentation but should be catched
    if (products.length === 0) {
      return null;
    }

    const firstProduct = products[0]!;

    // A name is not always set, even though the product exists, in this case, return null and let the User enter the product information manually
    if (firstProduct.name === undefined) {
      logger.warn(
        `First product of OpenGTINDB Response for ean ${ean} and userid ${adapterConfig.userid} did not yield a name`
      );
      return null;
    }

    return {
      ean,
      name: firstProduct.name,
      brand: firstProduct.vendor ?? null,
      extra: firstProduct.pack ?? null,
    };
  }
}

export default OpengtindbAdapter;
