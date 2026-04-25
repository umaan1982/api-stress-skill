import { readFileSync } from "fs";
import { parse } from "yaml";

export interface QueryParam {
  name: string;
  type: string;
  isArray: boolean;
  required: boolean;
}

export interface Endpoint {
  path: string;
  method: string;
  operationId: string;
  tags: string[];
  queryParams: QueryParam[];
}

export function parseOpenApiSpec(specPath: string): Endpoint[] {
  const content = readFileSync(specPath, "utf-8");
  const spec = parse(content);
  const endpoints: Endpoint[] = [];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
      if (method === "options") continue;

      const queryParams: QueryParam[] = [];

      for (const param of details.parameters || []) {
        if (param.in === "query") {
          const schema = param.schema || {};
          const isArray = schema.type === "array" || !!schema.items;

          queryParams.push({
            name: param.name,
            type: isArray ? schema.items?.type || "string" : schema.type || "string",
            isArray,
            required: param.required || false,
          });
        }
      }

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: details.operationId || "",
        tags: details.tags || [],
        queryParams,
      });
    }
  }

  return endpoints;
}

export function filterEndpoints(
  endpoints: Endpoint[],
  options: { method?: string; pathPattern?: string; tag?: string }
): Endpoint[] {
  return endpoints.filter((ep) => {
    if (options.method && ep.method !== options.method.toUpperCase()) return false;
    if (options.pathPattern && !ep.path.includes(options.pathPattern)) return false;
    if (options.tag && !ep.tags.includes(options.tag)) return false;
    return true;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const specPath = process.argv[2];
  if (!specPath) {
    console.error("Usage: ts-node parser.ts <path-to-openapi-spec>");
    process.exit(1);
  }

  const endpoints = parseOpenApiSpec(specPath);
  console.log(`Parsed ${endpoints.length} endpoints`);

  const withArrayParams = endpoints.filter((e) => e.queryParams.some((p) => p.isArray));
  console.log(`Endpoints with array params: ${withArrayParams.length}`);

  for (const ep of withArrayParams.slice(0, 10)) {
    const arrays = ep.queryParams.filter((p) => p.isArray).map((p) => p.name);
    console.log(`  ${ep.method} ${ep.path} - arrays: ${arrays.join(", ")}`);
  }
}