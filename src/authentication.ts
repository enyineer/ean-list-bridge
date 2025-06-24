import type { BunRequest } from "bun";
import { config, getServiceConfig, type ServiceConfig } from "./config";

export function checkToken(serviceName: string, req: BunRequest) {
  let serviceConfig: ServiceConfig;
  try {
    serviceConfig = getServiceConfig(serviceName);
  } catch (err) {
    console.error(err);
    return false;
  }

  const authorizationHeader = req.headers.get("authorization");

  if (authorizationHeader === null) {
    return false;
  }

  const [type, value] = authorizationHeader.split(" ");

  if (type?.toLowerCase() !== "token") {
    return false;
  }

  if (value !== serviceConfig.apiToken) {
    return false;
  }

  return true;
}
