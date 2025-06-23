import type { AdapterBase, AdapterBaseConfig } from "../adapterBase";
import type { Product } from "../product";

export interface SourceAdapter<C extends AdapterBaseConfig>
  extends AdapterBase<C> {
  /**
   * In seconds as unix epoch timestamp
   */
  getCacheTTL(): number;
  find(ean: string, adapterConfig: C): Promise<Product | null>;
}
