import { Endpoint, QueryParam } from "./parser.js";

export interface StressTestCase {
  endpoint: Endpoint;
  params: Record<string, string | string[]>;
  description: string;
}

const ARRAY_SIZES = [1, 5, 10, 20, 30, 50, 100, 200];
const PAGINATION_LIMITS = [10, 50, 100, 500, 1000, 2000];
const PAGINATION_OFFSETS = [0, 100, 1000, 5000, 10000, 50000];
const STRING_LENGTHS = [10, 100, 500, 1000];
const CONCURRENT_BATCHES = [1, 5, 10, 20];

export function generateStressTestCases(endpoint: Endpoint): StressTestCase[] {
  const cases: StressTestCase[] = [];

  const arrayParams = endpoint.queryParams.filter((p) => p.isArray);
  const stringParams = endpoint.queryParams.filter((p) => p.type === "string" && !p.isArray);
  const boolParams = endpoint.queryParams.filter((p) => p.type === "boolean");
  const limitParam = endpoint.queryParams.find((p) => p.name === "limit");
  const offsetParam = endpoint.queryParams.find((p) => p.name === "offset");
  const searchParam = endpoint.queryParams.find((p) =>
    p.name === "search" || p.name === "query" || p.name === "q" || p.name === "filter"
  );

  cases.push({
    endpoint,
    params: {},
    description: "baseline (no params)",
  });

  for (const param of arrayParams) {
    for (const size of ARRAY_SIZES) {
      const values = generateArrayValues(param, size);
      cases.push({
        endpoint,
        params: { [param.name]: values },
        description: `${param.name}[${size}]`,
      });
    }
  }

  if (limitParam) {
    for (const limit of PAGINATION_LIMITS) {
      cases.push({
        endpoint,
        params: { limit: String(limit) },
        description: `limit=${limit}`,
      });
    }
  }

  if (limitParam && offsetParam) {
    for (const offset of PAGINATION_OFFSETS) {
      cases.push({
        endpoint,
        params: { limit: "100", offset: String(offset) },
        description: `limit=100,offset=${offset}`,
      });

      cases.push({
        endpoint,
        params: { limit: "1000", offset: String(offset) },
        description: `limit=1000,offset=${offset}`,
      });
    }
  }

  if (searchParam) {
    for (const len of STRING_LENGTHS) {
      cases.push({
        endpoint,
        params: { [searchParam.name]: "a".repeat(len) },
        description: `${searchParam.name}=${len}chars`,
      });
    }

    cases.push({
      endpoint,
      params: { [searchParam.name]: "%" },
      description: `${searchParam.name}=wildcard`,
    });
  }

  for (const param of stringParams.slice(0, 3)) {
    if (param.name === "limit" || param.name === "offset") continue;
    if (param.enum) continue;
    cases.push({
      endpoint,
      params: { [param.name]: "a".repeat(500) },
      description: `${param.name}=500chars`,
    });
  }

  const enumParams = endpoint.queryParams.filter((p) => p.enum && !p.isArray);
  for (const param of enumParams) {
    cases.push({
      endpoint,
      params: { [param.name]: "invalid_enum_value" },
      description: `${param.name}=invalid_enum`,
    });
  }

  if (boolParams.length > 0) {
    const allTrue: Record<string, string> = {};
    const allFalse: Record<string, string> = {};
    for (const param of boolParams) {
      allTrue[param.name] = "true";
      allFalse[param.name] = "false";
    }
    cases.push({ endpoint, params: allTrue, description: "all bools=true" });
    cases.push({ endpoint, params: allFalse, description: "all bools=false" });
  }

  if (arrayParams.length > 1) {
    const combinedSmall: Record<string, string[]> = {};
    const combinedMedium: Record<string, string[]> = {};
    const combinedLarge: Record<string, string[]> = {};
    for (const param of arrayParams) {
      combinedSmall[param.name] = generateArrayValues(param, 10);
      combinedMedium[param.name] = generateArrayValues(param, 50);
      combinedLarge[param.name] = generateArrayValues(param, 100);
    }
    cases.push({ endpoint, params: combinedSmall, description: "combined arrays (10 each)" });
    cases.push({ endpoint, params: combinedMedium, description: "combined arrays (50 each)" });
    cases.push({ endpoint, params: combinedLarge, description: "combined arrays (100 each)" });
  }

  if (endpoint.queryParams.length > 3) {
    const allParams: Record<string, string | string[]> = {};
    for (const param of endpoint.queryParams) {
      if (param.isArray) {
        allParams[param.name] = generateArrayValues(param, 20);
      } else if (param.name === "limit") {
        allParams[param.name] = "500";
      } else if (param.name === "offset") {
        allParams[param.name] = "0";
      } else {
        allParams[param.name] = generateParamValue(param);
      }
    }
    cases.push({ endpoint, params: allParams, description: "all params combined (schema-valid)" });
  }

  return cases;
}

function generateArrayValues(param: QueryParam, count: number): string[] {
  const values: string[] = [];

  if (param.enum && param.enum.length > 0) {
    for (let i = 0; i < count; i++) {
      values.push(param.enum[i % param.enum.length]);
    }
    return values;
  }

  if (param.format === "uuid") {
    for (let i = 0; i < count; i++) {
      values.push(generateUuid(i));
    }
    return values;
  }

  for (let i = 1; i <= count; i++) {
    if (param.type === "integer" || param.type === "number") {
      values.push(String(i));
    } else {
      values.push(`value-${i}`);
    }
  }
  return values;
}

function generateParamValue(param: QueryParam): string {
  if (param.enum && param.enum.length > 0) {
    return param.enum[0];
  }

  if (param.default !== undefined) {
    return String(param.default);
  }

  if (param.format === "uuid") {
    return generateUuid(1);
  }

  if (param.format === "date") {
    return "2026-01-15";
  }

  if (param.format === "date-time") {
    return "2026-01-15T10:30:00Z";
  }

  if (param.type === "integer" || param.type === "number") {
    return "100";
  }

  if (param.type === "boolean") {
    return "true";
  }

  return "test-value";
}

function generateUuid(seed: number): string {
  const hex = seed.toString(16).padStart(8, "0");
  return `${hex}-0000-4000-8000-000000000000`;
}

export function generateIdDiscoveryParams(ids: string[], sizes: number[]): Record<string, string[]>[] {
  const results: Record<string, string[]>[] = [];

  for (const size of sizes) {
    const slice = ids.slice(0, size);
    if (slice.length > 0) {
      results.push({ ids: slice });
    }
  }

  return results;
}