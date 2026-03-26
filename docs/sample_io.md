# Sample Inputs and Outputs

## Sample request
```http
GET /health
```

## Sample environment setup
```env
DATABASE_HEALTHCHECK_URL=http://localhost:5432/health
EXTERNAL_API_HEALTHCHECK_URL=http://localhost:4000/health
HEALTHCHECK_TIMEOUT_MS=800
```

## Sample response when database fails
```json
{
  "status": "fail",
  "services": {
    "database": { "status": "fail", "error": "timeout", "latency_ms": 805 }
  },
  "latency_ms": 806
}
```
