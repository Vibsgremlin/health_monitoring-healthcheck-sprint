const request = require("supertest");
const { app } = require("../src/app");
const { getHealthStatus } = require("../src/health/checks");

describe("GET /health", () => {
  afterEach(() => {
    app.set("healthEvaluator", null);
  });

  test("returns 200 and status ok for healthy checks", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("services");
    expect(res.body).toHaveProperty("latency_ms");
    expect(res.body.services).toHaveProperty("database");
  });

  test("returns 200 when aggregate status is degraded", async () => {
    app.set("healthEvaluator", async () => ({
      status: "degraded",
      services: {
        database: { status: "ok", latency_ms: 4 },
        external_api: { status: "fail", error: "timeout", latency_ms: 800 }
      }
    }));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "degraded");
    expect(res.body.services).toHaveProperty("external_api");
  });

  test("returns 503 when aggregate status is fail", async () => {
    app.set("healthEvaluator", async () => ({
      status: "fail",
      services: {
        database: { status: "fail", error: "timeout", latency_ms: 805 }
      }
    }));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty("status", "fail");
    expect(res.body.services.database).toHaveProperty("error", "timeout");
  });
});

describe("health aggregation checks", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("degrades optional dependencies when configuration is missing", async () => {
    delete process.env.EXTERNAL_API_HEALTHCHECK_URL;
    delete process.env.NOTIFICATION_PROVIDER_HEALTHCHECK_URL;
    delete process.env.INTERNAL_SERVICE_HEALTHCHECK_URL;

    const status = await getHealthStatus();

    expect(status.status).toBe("ok");
    expect(status.services.external_api).toHaveProperty("status", "degraded");
    expect(status.services.external_api).toHaveProperty(
      "error",
      "missing_configuration"
    );
  });

  test("marks database as fail on timeout and propagates fail aggregate", async () => {
    process.env.DATABASE_HEALTHCHECK_URL = "http://10.255.255.1:1";
    process.env.HEALTHCHECK_TIMEOUT_MS = "10";

    const status = await getHealthStatus();

    expect(status.status).toBe("fail");
    expect(status.services.database).toHaveProperty("status", "fail");
    expect(status.services.database).toHaveProperty("error", "timeout");
  });
});
