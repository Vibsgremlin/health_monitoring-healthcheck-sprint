// Intentionally minimal/static health checks used as the "starting snapshot".
// The sprint task will upgrade these into real dependency checks.

async function getHealthStatusStatic() {
  return {
    services: {
      database: { status: "ok", latency_ms: null },
      external_api: { status: "ok", latency_ms: null },
      notification_provider: { status: "ok", latency_ms: null }
    }
  };
}

module.exports = { getHealthStatusStatic };

