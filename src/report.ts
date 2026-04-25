import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { RequestResult } from "./runner.js";

export interface ReportOptions {
  env: string;
  tenant: string;
}

export function generateReport(results: RequestResult[], options: ReportOptions): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 16);

  const failed = results.filter((r) => r.status >= 500 || r.status === 0);
  const slow3s = results.filter((r) => r.latencyMs > 3000 && r.status < 500);
  const slow1s = results.filter((r) => r.latencyMs > 1000 && r.latencyMs <= 3000 && r.status < 500);

  const lines: string[] = [
    `# Stress Test Report`,
    ``,
    `**Date:** ${now.toISOString()}`,
    `**Environment:** ${options.env}`,
    `**Tenant:** ${options.tenant}`,
    ``,
    `## Summary`,
    ``,
    `- Total requests: ${results.length}`,
    `- Failed (5xx/timeout): ${failed.length}`,
    `- Slow (>3s): ${slow3s.length}`,
    `- Slow (1-3s): ${slow1s.length}`,
    `- Success (<1s): ${results.length - failed.length - slow3s.length - slow1s.length}`,
    ``,
  ];

  if (failed.length > 0) {
    lines.push(`## Failed Requests (5xx/timeout)`, ``);
    lines.push(`| Endpoint | Params | Status | Latency | Error |`);
    lines.push(`|----------|--------|--------|---------|-------|`);
    for (const r of failed) {
      const params = formatParams(r.params);
      lines.push(`| ${r.endpoint.method} ${r.endpoint.path} | ${params} | ${r.status} | ${r.latencyMs}ms | ${r.error || ""} |`);
    }
    lines.push(``);
  }

  if (slow3s.length > 0) {
    lines.push(`## Slow Requests (>3s)`, ``);
    lines.push(`| Endpoint | Params | Status | Latency | Size |`);
    lines.push(`|----------|--------|--------|---------|------|`);
    for (const r of slow3s.sort((a, b) => b.latencyMs - a.latencyMs)) {
      const params = formatParams(r.params);
      lines.push(`| ${r.endpoint.method} ${r.endpoint.path} | ${params} | ${r.status} | ${r.latencyMs}ms | ${formatSize(r.responseSize)} |`);
    }
    lines.push(``);
  }

  if (slow1s.length > 0) {
    lines.push(`## Moderate Requests (1-3s)`, ``);
    lines.push(`| Endpoint | Params | Status | Latency | Size |`);
    lines.push(`|----------|--------|--------|---------|------|`);
    for (const r of slow1s.sort((a, b) => b.latencyMs - a.latencyMs)) {
      const params = formatParams(r.params);
      lines.push(`| ${r.endpoint.method} ${r.endpoint.path} | ${params} | ${r.status} | ${r.latencyMs}ms | ${formatSize(r.responseSize)} |`);
    }
    lines.push(``);
  }

  lines.push(`## All Results`, ``);
  lines.push(`| Endpoint | Params | Status | Latency | Size |`);
  lines.push(`|----------|--------|--------|---------|------|`);
  for (const r of results.sort((a, b) => b.latencyMs - a.latencyMs)) {
    const params = formatParams(r.params);
    lines.push(`| ${r.endpoint.method} ${r.endpoint.path} | ${params} | ${r.status} | ${r.latencyMs}ms | ${formatSize(r.responseSize)} |`);
  }

  const content = lines.join("\n");

  const reportsDir = resolve(process.cwd(), "reports");
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = resolve(reportsDir, `${timestamp}.md`);
  writeFileSync(reportPath, content);

  return reportPath;
}

function formatParams(params: Record<string, string | string[]>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      parts.push(`${key}[${value.length}]`);
    } else {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join(", ") || "-";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}