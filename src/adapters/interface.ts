import { z, type ZodType } from "zod/v4";

export const adapterBaseConfigSchema = z.object({
  adapterName: z.string(),
});

export type AdapterBaseConfig = z.infer<typeof adapterBaseConfigSchema>;

export interface AdapterBase<C extends AdapterBaseConfig> {
  /**
   * Should a return a unique adapter name which will be saved to the adapterRegistry. Duplicates will crash the application on startup.
   */
  getAdapterName(): string;
  /**
   * Should return the adapters specific ConfigDataSchema. This is used in the registry to make sure that a config is valid for a configured adapter.
   */
  getConfigDataSchema(): ZodType<C>;
}
