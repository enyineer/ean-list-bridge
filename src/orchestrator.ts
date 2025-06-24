import { and, eq, gt, or } from "drizzle-orm";
import { getAdapter } from "./adapters/registry";
import type {
  BotAdapter,
  BotAdapterBaseConfig,
  BotAddEvent,
  BotStartEvent,
  BotUpdateFnReturnValue,
} from "./adapters/bot/interface";
import { config, getServiceConfig, type ServiceConfig } from "./config";
import { db } from "./db";
import type {
  ListAdapter,
  ListAdapterBaseConfig,
} from "./adapters/list/interface";
import type { Product } from "./product";
import { eanCache } from "./schema";
import type {
  SourceAdapter,
  SourceAdapterBaseConfig,
} from "./adapters/source/interface";
import { checkToken } from "./authentication";
import z from "zod/v4";
import { validateEAN } from "./validation";
import { logger } from "./logger";

export async function setup(serverPort: number) {
  // Setup API
  await setupAPI(serverPort);
  // Call setup function for all bots defined in all services
  for (const service of config.services) {
    await setupServiceBot(service);
  }
}

async function setupServiceBot(serviceConfig: ServiceConfig) {
  // Get adapter for this services bot
  const adapter = await getAdapter<BotAdapter<BotAdapterBaseConfig>>(
    "bot",
    serviceConfig
  );
  // Start bot
  logger.debug(
    `Starting bot of type ${adapter.getAdapterName()} for service ${
      serviceConfig.serviceName
    }`
  );
  await adapter.start(serviceConfig.bot, async (event) => {
    switch (event.type) {
      case "add":
        return await handleBotAddEvent(event, serviceConfig);
      case "start":
        return await handleBotStartEvent(event, serviceConfig);
      default:
        throw new Error(`Bot event type ${event} not implemented`);
    }
  });
  logger.debug(
    `Successfully started bot of type ${adapter.getAdapterName()} for service ${
      serviceConfig.serviceName
    }`
  );
}

async function handleBotStartEvent(
  _event: BotStartEvent,
  serviceConfig: ServiceConfig
): BotUpdateFnReturnValue {
  return {
    message: `Welcome to the EAN Shopping List Bot! This bot let's you add missing EANs to your EAN-List-Bridge (${serviceConfig.serviceName}) interactively and informs you about products added to your lists.`,
  };
}

async function handleBotAddEvent(
  event: BotAddEvent,
  serviceConfig: ServiceConfig
): BotUpdateFnReturnValue {
  const { data } = event;

  try {
    await addProduct(data.product, serviceConfig);
    await updateCache(data.product, true, serviceConfig);
  } catch (err) {
    if (err instanceof Error) {
      return {
        message: `An error occured while trying to save your new product: ${err.message}`,
      };
    }
    throw err;
  }

  return null;
}

async function setupAPI(serverPort: number) {
  const scanBodySchema = z.object({
    ean: z.string(),
  });

  logger.debug("Starting API server...");

  const server = Bun.serve({
    port: serverPort,
    routes: {
      "/api/v1/service/:serviceName/scan": {
        POST: async (req) => {
          const serviceName = req.params.serviceName;

          if (!checkToken(serviceName, req)) {
            return Response.json({ message: "Invalid auth" }, { status: 403 });
          }

          let rawBody: unknown;
          try {
            rawBody = await req.json();
          } catch (err) {
            logger.debug(
              `[${serviceName}] Received invalid JSON Body: ${JSON.stringify(
                err
              )}`
            );
            return Response.json(
              { message: "Invalid JSON body" },
              { status: 400 }
            );
          }

          const body = await scanBodySchema.safeParseAsync(rawBody);

          if (!body.success) {
            logger.debug(
              `[${serviceName}] Received invalid JSON data: ${JSON.stringify(
                z.treeifyError(body.error)
              )}`
            );
            return Response.json(
              {
                message: "Invalid body",
                error: z.treeifyError(body.error),
              },
              { status: 400 }
            );
          }

          logger.debug(
            `[${serviceName}] Received correct JSON Body for scan: ${JSON.stringify(
              body.data
            )}`
          );

          logger.info(`[${serviceName}] Processing EAN ${body.data.ean}`);

          const success = await processScannedEAN(serviceName, body.data.ean);

          if (success) {
            logger.debug(`[${serviceName}] Correctly processed EAN`);
            return Response.json({
              message: "Successfully added EAN to destination list",
            });
          } else {
            logger.debug(
              `[${serviceName}] Could not process EAN, probably is not known`
            );
            return Response.json({
              message:
                "Could not add EAN, but user will be asked via bot to add product manually",
            });
          }
        },
      },
    },
  });

  logger.debug("Successfully started API server");

  // Listen for the Docker‐stop SIGTERM
  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down API Server");
    await server.stop(); // stops accepting new connections
    logger.info("Server has shut down cleanly");
  });
}

// This function should be called when an ean is scanned for a specific service
async function processScannedEAN(serviceName: string, ean: string) {
  if (!validateEAN(ean)) {
    throw new Error(`Invalid EAN ${ean}`);
  }

  const serviceConfig = getServiceConfig(serviceName);

  // Get all necessary configs for this service
  const sourceConfig = serviceConfig.source;
  const botConfig = serviceConfig.bot;

  // Get all necessary adapters for this service with their services configs
  const sourceAdapter = await getAdapter<
    SourceAdapter<SourceAdapterBaseConfig>
  >("source", serviceConfig);
  const botAdapter = await getAdapter<BotAdapter<BotAdapterBaseConfig>>(
    "bot",
    serviceConfig
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
    logger.debug(
      `[${
        serviceConfig.serviceName
      }] Found cached product for EAN ${ean}: ${JSON.stringify(product)}`
    );
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

  try {
    // Now try to get the EAN from source adapter
    const product = await sourceAdapter.find(ean, sourceConfig);

    // If product is found, add product immediately and return early
    if (product !== null) {
      logger.debug(
        `[${
          serviceConfig.serviceName
        }] Received product for EAN ${ean} from Source Adapter: ${JSON.stringify(
          product
        )}`
      );
      await updateCache(product, false, serviceConfig);
      return await addProduct(product, serviceConfig);
    }
  } catch (err) {
    if (err instanceof Error) {
      logger.error(err);
    }
    throw err;
  }

  // Product was not found in database, ask user to add product
  logger.info(
    `Did not find a product for EAN ${ean} in Cache or Source Adapter. Asking user via Bot to add product manually.`
  );
  await botAdapter.sendMessage(
    `😢 I couldn't find a product with EAN ${ean}. Please add it manually once via command ${botAdapter.getAddCommandExample(
      ean
    )}`,
    botConfig
  );

  return false;
}

async function addProduct(
  product: Product,
  serviceConfig: ServiceConfig
): Promise<boolean> {
  // Get list adapter for this service
  const listConfig = serviceConfig.list;
  const botConfig = serviceConfig.bot;
  const listAdapter = await getAdapter<ListAdapter<ListAdapterBaseConfig>>(
    "list",
    serviceConfig
  );
  const botAdapter = await getAdapter<BotAdapter<BotAdapterBaseConfig>>(
    "bot",
    serviceConfig
  );

  if (await listAdapter.hasProduct(product, listConfig)) {
    // Skip adding product as it's already on the list
    logger.info(
      `[${serviceConfig.serviceName}] Skipping adding product with EAN ${product.ean} to list "${listConfig.adapterName}" because it exists on this list.`
    );
    return true;
  }

  // Add the product to the list adapter
  await listAdapter.addProduct(product, listConfig);

  logger.info(
    `[${serviceConfig.serviceName}] Successfully added product with EAN ${product.ean} to list "${listConfig.adapterName}".`
  );

  await botAdapter.sendMessage(
    `${product.name} was added to your shopping list 🛒`,
    botConfig
  );

  return true;
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
