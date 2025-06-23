import { z, type ZodType } from "zod/v4";

export const adapterBaseConfigSchema = z.object({
  adapterName: z.string(),
});

export type AdapterBaseConfig = z.infer<typeof adapterBaseConfigSchema>;

export interface AdapterBase<C extends AdapterBaseConfig> {
  getAdapterName(): string;
  getConfigDataSchema(): ZodType<C>;
}
