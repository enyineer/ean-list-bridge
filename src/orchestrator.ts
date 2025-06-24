import { and, eq, gt, or } from "drizzle-orm";
import type { AdapterBaseConfig } from "./adapterBase";
import { getAdapter } from "./adapterRegistry";
import type { BotAdapter } from "./botAdapters/interface";
import { config, getServiceConfig, type ServiceConfig } from "./config";
import { db } from "./db";
import type { ListAdapter } from "./listAdapters/interface";
import type { Product } from "./product";
import { eanCache } from "./schema";
import type { SourceAdapter } from "./sourceAdapters/interface";
import { checkToken } from "./authentication";

export async function setup() {
  // Call setup function for all bots defined in all services
  for (const service of config.services) {
    await setupBots(service);
  }
}

async function setupBots(service: ServiceConfig) {
  // Get adapter for this services bot
  const adapter = getAdapter<BotAdapter<AdapterBaseConfig>>(
    service.bot.adapterName,
    "bot"
  );
  // Make sure this configuration actually adheres to the adapters config schema
  const config = await adapter.getConfigDataSchema().parseAsync(service.bot);
  // Start bot
  console.log(
    `Starting bot of type ${service.bot.adapterName} for service ${service.serviceName}`
  );
  await adapter.start(config);
  console.log(
    `Successfully started bot of type ${service.bot.adapterName} for service ${service.serviceName}`
  );

  // TODO: Add listeners for incoming updates and add product + update cache as manual item
}

async function setupAPI(service: ServiceConfig) {
  Bun.serve({
    routes: {
      "/api/v1/service/:serviceName/scan": {
        POST: async (req) => {
          const serviceName = req.params.serviceName;

          if (!checkToken(serviceName, req)) {
            return Response.json({ message: "Invalid token" }, { status: 403 });
          }

          const body = await req.json();
          return Response.json({ created: true });
        },
      },
    },
  });
}

// This function should be called when an ean is scanned for a specific service
export async function scan(serviceName: string, ean: string) {
  const serviceConfig = getServiceConfig(serviceName);

  // Get all necessary configs for this service
  const sourceConfig = serviceConfig.source;
  const botConfig = serviceConfig.bot;

  // Get all necessary adapters for this service with their services configs
  const sourceAdapter = getAdapter<SourceAdapter<AdapterBaseConfig>>(
    sourceConfig.adapterName,
    "source"
  );
  const botAdapter = getAdapter<BotAdapter<AdapterBaseConfig>>(
    botConfig.adapterName,
    "bot"
  );

  // Calculate ttl expiration date for this source adapter
  const ttlExpirationDate = new Date();
  ttlExpirationDate.setSeconds(
    ttlExpirationDate.getSeconds() - sourceAdapter.getCacheTTL()
  );
  // Check if ean exists in cache for this service
  const cachedProduct = await db
    .select()
    .from(eanCache)
    .where(
      and(
        // Only get cached items that match ean and service
        and(
          eq(eanCache.ean, ean),
          eq(eanCache.service, serviceConfig.serviceName)
        ),
        // Only get items that are not stale or manually added
        or(
          gt(eanCache.updated_at, ttlExpirationDate),
          eq(eanCache.manual, true)
        )
      )
    );

  if (cachedProduct.length > 0) {
    // Found cached product, return early
    const product = cachedProduct[0]!;
    return await addProduct(
      {
        ean: product.ean,
        name: product.name,
        brand: product.brand,
        extra: product.extra,
      },
      serviceConfig
    );
  }

  // Now try to get the EAN from source adapter
  const product = await sourceAdapter.find(ean, sourceConfig);

  // If product is found, add product immediately and return early
  if (product !== null) {
    await updateCache(product, false, serviceConfig);
    return await addProduct(product, serviceConfig);
  }
}

async function addProduct(product: Product, serviceConfig: ServiceConfig) {
  // Get list adapter for this service
  const listConfig = serviceConfig.list;
  const listAdapter = getAdapter<ListAdapter<AdapterBaseConfig>>(
    listConfig.adapterName,
    "list"
  );

  // Add the product to the list adapter
  await listAdapter.add(product, listConfig);
}

async function updateCache(
  product: Product,
  isManual: boolean,
  serviceConfig: ServiceConfig
) {
  await db
    .insert(eanCache)
    .values({
      ean: product.ean,
      manual: isManual,
      name: product.name,
      brand: product.brand,
      extra: product.extra,
      service: serviceConfig.serviceName,
    })
    .onConflictDoUpdate({
      target: [eanCache.ean, eanCache.service],
      set: {
        manual: isManual,
        name: product.name,
        brand: product.brand,
        extra: product.extra,
        updated_at: new Date(),
      },
    });
}
