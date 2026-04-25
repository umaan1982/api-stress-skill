# API Stress Test Skill

Stress test API endpoints with query parameter variations to find slow/breaking queries.

## Trigger
- `/stress-test` or `/stress`
- "stress test the API"
- "find slow endpoints"
- "test inbox endpoint"

## Inputs
- `env`: staging | production (default: staging)
- `endpoint`: specific endpoint path (optional, tests all if omitted)
- `token`: bearer token (will prompt if not provided)

## What it does
1. Parses OpenAPI spec from packaging repo
2. Hits endpoints with varying query params (array sizes, pagination, filters)
3. Measures latency, tracks errors
4. Generates markdown report in reports/

## Example usage
```
/stress-test staging
/stress-test --endpoint /inbox
```