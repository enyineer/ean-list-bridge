import { Glob } from "bun";
import { join } from "path";
import type { AdapterBase, AdapterBaseConfig } from "./adapterBase";

const listAdaptersGlob = new Glob("listAdapters/*.adapter.ts");
const sourceAdaptersGlob = new Glob("sourceAdapters/*.adapter.ts");
const botAdaptersGlob = new Glob("botAdapters/*.adapter.ts");

const cwd = "./src";

type AdapterRegistry = Record<string, AdapterBase<AdapterBaseConfig>>;

const listAdapterRegistry: AdapterRegistry = {};
const sourceAdapterRegistry: AdapterRegistry = {};
const botAdapterRegistry: AdapterRegistry = {};

async function addAdapter(path: string, registry: AdapterRegistry) {
  const instance = new (
    await import(path)
  ).default() as AdapterBase<AdapterBaseConfig>;

  const adapterName = instance.getAdapterName();

  if (Object.hasOwn(registry, adapterName)) {
    throw new Error(`Duplicate adapter name ${adapterName}.`);
  }

  registry[adapterName] = instance;
}

// Scan listAdapters for all adapters
for await (const file of listAdaptersGlob.scan({ cwd })) {
  await addAdapter(join(cwd, file), listAdapterRegistry);
}

// Scan sourceAdapters for all adapters
for await (const file of sourceAdaptersGlob.scan({ cwd })) {
  await addAdapter(join(cwd, file), sourceAdapterRegistry);
}

// Scan botAdapters for all adapters
for await (const file of botAdaptersGlob.scan({ cwd })) {
  await addAdapter(join(cwd, file), botAdapterRegistry);
}

export function getAdapter<T extends AdapterBase<AdapterBaseConfig>>(
  adapterName: string,
  registryType: "source" | "list" | "bot"
) {
  let registry: AdapterRegistry;

  switch (registryType) {
    case "list":
      registry = listAdapterRegistry;
      break;
    case "source":
      registry = sourceAdapterRegistry;
      break;
    case "bot":
      registry = botAdapterRegistry;
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

  return registry[adapterName] as T;
}
