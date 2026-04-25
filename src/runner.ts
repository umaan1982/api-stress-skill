import { Config } from "./config.js";
import { Endpoint } from "./parser.js";

export interface RequestResult {
  endpoint: Endpoint;
  params: Record<string, string | string[]>;
  status: number;
  latencyMs: number;
  error?: string;
  responseSize: number;
}

export async function executeRequest(
  config: Config,
  endpoint: Endpoint,
  params: Record<string, string | string[]>
): Promise<RequestResult> {
  const url = buildUrl(config, endpoint.path, params);
  const isExternal = isExternalEndpoint(endpoint.path);

  const start = performance.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isExternal && config.supplierToken) {
    headers["x-supplier-auth"] = config.supplierToken;
  } else {
    headers.Authorization = config.authToken.startsWith("Bearer ") ? config.authToken : `Bearer ${config.authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
    });

    const latencyMs = Math.round(performance.now() - start);
    const body = await response.text();

    return {
      endpoint,
      params,
      status: response.status,
      latencyMs,
      responseSize: body.length,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      endpoint,
      params,
      status: 0,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
      responseSize: 0,
    };
  }
}

function isExternalEndpoint(path: string): boolean {
  return path.includes("/external/");
}

function buildUrl(
  config: Config,
  path: string,
  params: Record<string, string | string[]>
): string {
  const isExternal = isExternalEndpoint(path);
  const tenant = isExternal && config.supplierTenant ? config.supplierTenant : config.tenant;

  let resolvedPath = path.replace("{tenant}", tenant);

  if (isExternal && config.supplierId) {
    resolvedPath = resolvedPath.replace("{supplierId}", config.supplierId);
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(`${key}[]`, v);
      }
    } else {
      searchParams.append(key, value);
    }
  }

  const queryString = searchParams.toString();
  const fullUrl = `${config.baseUrl}${resolvedPath}${queryString ? `?${queryString}` : ""}`;

  return fullUrl;
}

export async function executeWithRetry(
  config: Config,
  endpoint: Endpoint,
  params: Record<string, string | string[]>,
  retries = 1
): Promise<RequestResult> {
  let result = await executeRequest(config, endpoint, params);

  for (let i = 0; i < retries && result.status === 0; i++) {
    await sleep(1000 * (i + 1));
    result = await executeRequest(config, endpoint, params);
  }

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}