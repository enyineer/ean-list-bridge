import type { AdapterBase, AdapterBaseConfig } from "../adapterBase";
import type { Product } from "../product";

export interface ListAdapter<C extends AdapterBaseConfig>
  extends AdapterBase<C> {
  add(product: Product, adapterConfig: C): Promise<void>;
}
