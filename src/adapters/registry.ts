import { Glob } from "bun";
import { join } from "path";
import type { AdapterBase, AdapterBaseConfig } from "./interface";
import type { ServiceConfig } from "../config";
import { logger } from "../logger";

const listAdaptersGlob = new Glob("list/**/*.adapter.ts");
const sourceAdaptersGlob = new Glob("source/**/*.adapter.ts");
const botAdaptersGlob = new Glob("bot/**/*.adapter.ts");

const cwd = "./src/adapters";

type AdapterRegistry = Record<string, AdapterBase<AdapterBaseConfig>>;

const listAdapterRegistry: AdapterRegistry = {};
const sourceAdapterRegistry: AdapterRegistry = {};
const botAdapterRegistry: AdapterRegistry = {};

async function addAdapter(path: string, registry: AdapterRegistry) {
  const instance = new (
    await import(path)
  ).default() as AdapterBase<AdapterBaseConfig>;

  const adapterName = instance.getAdapterName();

  logger.debug(`Registering adapter ${adapterName}...`);

  if (Object.hasOwn(registry, adapterName)) {
    throw new Error(`Duplicate adapter name ${adapterName} (${path}).`);
  }

  registry[adapterName] = instance;

  logger.debug(`Successfully registered adapter ${adapterName}`);
}

// Scan listAdapters for all adapters
for await (const file of listAdaptersGlob.scan({ cwd })) {
  await addAdapter(`./${file}`, listAdapterRegistry);
}

// Scan sourceAdapters for all adapters
for await (const file of sourceAdaptersGlob.scan({ cwd })) {
  await addAdapter(`./${file}`, sourceAdapterRegistry);
}

// Scan botAdapters for all adapters
for await (const file of botAdaptersGlob.scan({ cwd })) {
  await addAdapter(`./${file}`, botAdapterRegistry);
}

export async function getAdapter<T extends AdapterBase<AdapterBaseConfig>>(
  registryType: "source" | "list" | "bot",
  serviceConfig: ServiceConfig
) {
  let registry: AdapterRegistry;
  let config: AdapterBaseConfig;
  let adapterName: string;

  switch (registryType) {
    case "list":
      registry = listAdapterRegistry;
      config = serviceConfig.list;
      adapterName = serviceConfig.list.adapterName;
      break;
    case "source":
      registry = sourceAdapterRegistry;
      config = serviceConfig.source;
      adapterName = serviceConfig.source.adapterName;
      break;
    case "bot":
      registry = botAdapterRegistry;
      config = serviceConfig.bot;
      adapterName = serviceConfig.bot.adapterName;
      break;
    default:
      throw new Error(
        `Registry type ${registryType} not implemented in getAdapter()`
      );
  }

  if (!Object.hasOwn(registry, adapterName)) {
    throw new Error(
      `No adapter with name ${adapterName} registered for registry type ${registryType}.`
    );
  }

  const adapter = registry[adapterName] as T;

  // Check if services adapter config adheres to it's config schema
  await adapter.getConfigDataSchema().parseAsync(config);

  return adapter;
}

// Listen for the Docker‐stop SIGTERM
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down Registry");

  for (const [_key, value] of Object.entries(sourceAdapterRegistry)) {
    if (value.onShutdown) {
      await value.onShutdown();
    }
  }

  for (const [_key, value] of Object.entries(listAdapterRegistry)) {
    if (value.onShutdown) {
      await value.onShutdown();
    }
  }

  for (const [_key, value] of Object.entries(botAdapterRegistry)) {
    if (value.onShutdown) {
      await value.onShutdown();
    }
  }

  logger.info("Registry has shut down cleanly");
});
