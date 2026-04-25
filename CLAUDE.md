# API Stress Test Skill

Stress test API endpoints to find slow queries and breaking points.

## Purpose
- Hit endpoints with varying query params
- Find where things break (e.g., array params >20 items)
- Generate reports to guide query optimization

## Configuration

All sensitive config is in `.env` (gitignored):
```env
BASE_URL=<staging or prod URL>
TENANT=<tenant name>
AUTH_TOKEN=<bearer token from localStorage>
```

Copy `.env.example` to `.env` and fill in values.

## How to run stress tests

### 1. Ensure .env is configured

### 2. Parse OpenAPI spec
Provide path to `api.v1.compiled.yml` from target repo

### 3. Run stress strategies

For GET endpoints with array params:
- Hit with 1 item
- Hit with 5, 10, 20, 30, 50 items
- Record when it breaks

For pagination:
- limit=10, 100, 500, 1000
- Deep offsets: 0, 1000, 10000

### 4. Generate report
Output to `reports/YYYY-MM-DD-HH-mm.md`

## Query param stress patterns

```typescript
const arraySizes = [1, 5, 10, 20, 30, 50, 100];
const limits = [10, 50, 100, 500, 1000];
const offsets = [0, 100, 1000, 10000];
```

## Report format

```markdown
# Stress Test Report - {date}
Environment: staging | prod

## Failed (5xx)
| Endpoint | Params | Status | Latency |

## Slow (>3s)
| Endpoint | Params | Latency |

## All Results
...
```

## After running tests
1. Identify failing/slow endpoints
2. Find corresponding repository queries in target codebase
3. Check for missing indexes, N+1 queries, unoptimized JOINs
4. Suggest optimizations