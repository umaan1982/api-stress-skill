import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface Config {
  baseUrl: string;
  tenant: string;
  authToken: string;
  openApiSpecPath: string;
  supplierToken?: string;
  supplierId?: string;
  supplierTenant?: string;
}

export function loadConfig(): Config {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    throw new Error(".env file not found. Copy .env.example to .env and configure.");
  }

  const envContent = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};

  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    env[key] = valueParts.join("=");
  }

  const required = ["BASE_URL", "TENANT", "AUTH_TOKEN", "OPENAPI_SPEC_PATH"];
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  return {
    baseUrl: env.BASE_URL,
    tenant: env.TENANT,
    authToken: env.AUTH_TOKEN,
    openApiSpecPath: env.OPENAPI_SPEC_PATH,
    supplierToken: env.SUPPLIER_TOKEN,
    supplierId: env.SUPPLIER_ID,
    supplierTenant: env.SUPPLIER_TENANT || env.TENANT,
  };
}