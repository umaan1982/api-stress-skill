import { loadConfig } from "./config.js";
import { parseOpenApiSpec, filterEndpoints, Endpoint } from "./parser.js";
import { executeRequest, RequestResult } from "./runner.js";
import { generateStressTestCases, StressTestCase } from "./stress.js";
import { generateReport } from "./report.js";

interface Stats {
  total: number;
  completed: number;
  failed: number;
  slow: number;
  startTime: number;
}

async function main() {
  const args = process.argv.slice(2);
  const pathFilter = args.find((a) => a.startsWith("--path="))?.split("=")[1];
  const tagFilter = args.find((a) => a.startsWith("--tag="))?.split("=")[1];
  const methodFilter = args.find((a) => a.startsWith("--method="))?.split("=")[1];
  const concurrency = parseInt(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || "5");
  const delayMs = parseInt(args.find((a) => a.startsWith("--delay="))?.split("=")[1] || "50");

  console.log("Loading config...");
  const config = loadConfig();

  console.log("Parsing OpenAPI spec...");
  let endpoints = parseOpenApiSpec(config.openApiSpecPath);
  console.log(`Found ${endpoints.length} total endpoints`);

  endpoints = filterEndpoints(endpoints, {
    method: methodFilter,
    pathPattern: pathFilter,
    tag: tagFilter,
  });

  const getEndpoints = endpoints.filter((e) => e.method === "GET");
  console.log(`Testing ${getEndpoints.length} GET endpoints (stress testing safe read operations)`);
  console.log(`Concurrency: ${concurrency}, Delay: ${delayMs}ms between batches`);

  const allTestCases: { endpoint: Endpoint; testCase: StressTestCase }[] = [];
  for (const endpoint of getEndpoints) {
    const testCases = generateStressTestCases(endpoint);
    for (const testCase of testCases) {
      allTestCases.push({ endpoint, testCase });
    }
  }

  console.log(`Generated ${allTestCases.length} test cases total\n`);

  const stats: Stats = {
    total: allTestCases.length,
    completed: 0,
    failed: 0,
    slow: 0,
    startTime: Date.now(),
  };

  const results: RequestResult[] = [];

  for (let i = 0; i < allTestCases.length; i += concurrency) {
    const batch = allTestCases.slice(i, i + concurrency);

    const batchPromises = batch.map(async ({ endpoint, testCase }) => {
      const result = await executeRequest(config, endpoint, testCase.params);
      return { result, endpoint, testCase };
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { result, endpoint, testCase } of batchResults) {
      results.push(result);
      stats.completed++;

      const isFail = result.status >= 500 || result.status === 0;
      const isAuthError = result.status === 401 || result.status === 403;
      const isClientError = result.status >= 400 && result.status < 500;
      const isSlow = result.latencyMs > 3000;

      if (isFail) stats.failed++;
      if (isSlow) stats.slow++;

      const status = isFail ? "FAIL" : isAuthError ? "AUTH" : isClientError ? "4xx" : isSlow ? "SLOW" : "OK";
      const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
      const progress = `[${stats.completed}/${stats.total}]`;

      console.log(
        `${progress} ${status.padEnd(4)} ${result.status} ${result.latencyMs.toString().padStart(5)}ms | ${endpoint.method} ${endpoint.path.substring(0, 50)} | ${testCase.description}`
      );
    }

    if (i + concurrency < allTestCases.length) {
      await sleep(delayMs);
    }
  }

  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log(`\n--- Summary ---`);
  console.log(`Total: ${stats.total} | Failed: ${stats.failed} | Slow: ${stats.slow} | Time: ${totalTime}s`);

  console.log("\nGenerating report...");
  const reportPath = generateReport(results, {
    env: config.baseUrl.includes("staging") ? "staging" : "production",
    tenant: config.tenant,
  });

  console.log(`Report saved to: ${reportPath}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);