import type { AdapterBase, AdapterBaseConfig } from "../adapterBase";
import type { Product } from "../product";

export interface ListAdapter<C extends AdapterBaseConfig>
  extends AdapterBase<C> {
  addProduct(product: Product, adapterConfig: C): Promise<void>;
  hasProduct(ean: string, adapterConfig: C): Promise<boolean>;
}
