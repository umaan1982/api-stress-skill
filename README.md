# API Stress Test Skill

Claude Code skill for stress testing REST APIs with query parameter variations.

## Purpose

Find slow and breaking endpoints by:
- Testing array params with increasing sizes (1, 5, 10, 20, 50 items)
- Testing pagination limits and deep offsets
- Combining multiple filters
- Generating performance reports

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your config
# Copy your OpenAPI spec to ./api.v1.compiled.yml (gitignored)
```

## Configuration

Create `.env` with:
```env
BASE_URL=https://your-api.example.com
TENANT=your-tenant
AUTH_TOKEN=Bearer your-token-here
OPENAPI_SPEC_PATH=/path/to/api.compiled.yml
```

## Usage

Run all GET endpoints:
```bash
npm run stress
```

Filter by path:
```bash
npm run stress -- --path=/your-endpoint
```

Filter by tag:
```bash
npm run stress -- --tag=YourTag
```

Adjust concurrency and delay:
```bash
npm run stress -- --concurrency=10 --delay=20
```

## Output

Reports are saved to `reports/` directory as markdown files with:
- Failed requests (5xx, timeouts)
- Slow requests (>3s, 1-3s)
- Full results table

## As Claude Code Skill

When used with Claude Code, invoke with `/stress-test` to interactively test endpoints.