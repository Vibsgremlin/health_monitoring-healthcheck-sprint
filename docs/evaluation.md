# Evaluation Logs and Outputs

## What was evaluated
- Health route response shape
- Aggregation of `ok`, `degraded`, and `fail`
- HTTP status behavior for critical failures

## Observable outputs
- Healthy dependencies return `200` with `status: "ok"`
- Optional dependency issues can return `status: "degraded"`
- Critical dependency failure returns `503` with `status: "fail"`

## Example output
```json
{
  "status": "degraded",
  "services": {
    "database": { "status": "ok", "latency_ms": 4 },
    "external_api": { "status": "degraded", "error": "missing_configuration", "latency_ms": 1 }
  },
  "latency_ms": 7
}
```

## Notes
- The repo contains Jest / Supertest coverage for the route and aggregation logic.
- No production latency benchmark logs are committed in the repository.
