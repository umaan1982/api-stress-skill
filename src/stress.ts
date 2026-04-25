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
    cases.push({
      endpoint,
      params: { [param.name]: "a".repeat(500) },
      description: `${param.name}=500chars`,
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
      } else if (param.type === "boolean") {
        allParams[param.name] = "true";
      } else if (param.type === "integer" || param.type === "number") {
        allParams[param.name] = param.name === "limit" ? "500" : param.name === "offset" ? "0" : "100";
      } else {
        allParams[param.name] = "test-value";
      }
    }
    cases.push({ endpoint, params: allParams, description: "all params combined" });
  }

  return cases;
}

function generateArrayValues(param: QueryParam, count: number): string[] {
  const values: string[] = [];
  for (let i = 1; i <= count; i++) {
    if (param.type === "integer" || param.type === "number") {
      values.push(String(i));
    } else {
      values.push(`value-${i}`);
    }
  }
  return values;
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