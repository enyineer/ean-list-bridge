import { z } from "zod/v4";
import { adapterBaseConfigSchema } from "./adapterBase";

const serviceConfigSchema = z.object({
  serviceName: z.string(),
  apiToken: z.string(),
  bot: adapterBaseConfigSchema,
  source: adapterBaseConfigSchema,
  list: adapterBaseConfigSchema,
});
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

const configSchema = z.object({
  services: z.array(serviceConfigSchema),
});
export type Config = z.infer<typeof configSchema>;

const path = "config/config.json";
const file = Bun.file(path);

const contents = await file.json();

export const config = await configSchema.parseAsync(contents);

export function getServiceConfig(serviceName: string) {
  const serviceConfig = config.services.find(
    (e) => e.serviceName === serviceName
  );

  if (serviceConfig === undefined) {
    throw new Error(`No service with name ${serviceName} configured`);
  }

  return serviceConfig;
}
