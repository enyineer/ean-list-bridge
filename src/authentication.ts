import type { BunRequest } from "bun";
import { config, getServiceConfig, type ServiceConfig } from "./config";
import { logger } from "./logger";

export function checkToken(serviceName: string, req: BunRequest) {
  let serviceConfig: ServiceConfig;
  try {
    serviceConfig = getServiceConfig(serviceName);
  } catch (err) {
    logger.error(err);
    return false;
  }

  logger.debug(`[${serviceName}] Checking API token`);

  const authorizationHeader = req.headers.get("authorization");

  if (authorizationHeader === null) {
    logger.debug(`[${serviceName}] Request missing authorization header`);
    return false;
  }

  const [type, value] = authorizationHeader.split(" ");

  if (type?.toLowerCase() !== "token") {
    logger.debug(`[${serviceName}] Token is not of type "token"`);
    return false;
  }

  if (value !== serviceConfig.apiToken) {
    logger.debug(
      `[${serviceName}] Token value is not matching configured token`
    );
    return false;
  }

  logger.debug(`[${serviceName}] Token successfully verified`);
  return true;
}
