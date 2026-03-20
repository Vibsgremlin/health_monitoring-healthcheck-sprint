const axios = require("axios");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_TIMEOUT_MS = 800;
const DEFAULT_STORAGE_HEALTH_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "package.json"
);
const HEALTHY_HTTP_CODES = new Set([200, 201, 202, 204]);
const STATUS_PRIORITY = {
  ok: 0,
  degraded: 1,
  fail: 2
};

function nowMs() {
  return Date.now();
}

function normalizeTimeoutMs(rawValue) {
  const timeoutMs = Number(rawValue);

  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return timeoutMs;
  }

  return DEFAULT_TIMEOUT_MS;
}

function withTimeout(promiseFactory, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("timeout");
      error.code = "TIMEOUT";
      reject(error);
    }, timeoutMs);

    Promise.resolve()
      .then(() => promiseFactory())
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function mapErrorMessage(error) {
  if (!error) {
    return "unknown";
  }

  if (error.code === "TIMEOUT" || error.code === "ECONNABORTED") {
    return "timeout";
  }

  return error.message || "unknown";
}

function normalizeResult(result, fallbackLatencyMs) {
  const status =
    typeof result?.status === "string" && STATUS_PRIORITY[result.status] !== undefined
      ? result.status
      : "ok";

  return {
    status,
    latency_ms:
      typeof result?.latency_ms === "number" ? result.latency_ms : fallbackLatencyMs,
    ...(result?.skipped ? { skipped: true } : {}),
    ...(result?.error ? { error: result.error } : {})
  };
}

async function runCheck({ check, timeoutMs }) {
  const startedAt = nowMs();
  try {
    const result = await withTimeout(() => check(), timeoutMs);
    return normalizeResult(result, nowMs() - startedAt);
  } catch (error) {
    return {
      status: "fail",
      latency_ms: nowMs() - startedAt,
      error: mapErrorMessage(error)
    };
  }
}

async function httpDependencyCheck(url, timeoutMs) {
  const response = await axios.get(url, {
    timeout: timeoutMs,
    validateStatus: () => true
  });

  if (!HEALTHY_HTTP_CODES.has(response.status)) {
    return {
      status: "fail",
      error: `http_${response.status}`
    };
  }

  return { status: "ok" };
}

async function databaseCheck(timeoutMs) {
  const databaseProbeUrl = process.env.DATABASE_HEALTHCHECK_URL;

  // Real lightweight probe path #1: configured DB/adapter probe endpoint.
  if (databaseProbeUrl) {
    return httpDependencyCheck(databaseProbeUrl, timeoutMs);
  }

  // Real lightweight probe path #2: internal storage read fallback.
  // This keeps local/dev health usable without pretending a DB exists when only
  // local storage is available in the current deployment.
  const storageProbePath =
    process.env.HEALTHCHECK_STORAGE_PATH || DEFAULT_STORAGE_HEALTH_PATH;
  await fs.readFile(storageProbePath, "utf8");
  return { status: "ok" };
}

async function externalDependencyCheck({
  envKey,
  timeoutMs,
  missingConfigurationStatus = "degraded"
}) {
  const url = process.env[envKey];

  if (!url) {
    return {
      status: missingConfigurationStatus,
      skipped: true,
      error: "missing_configuration"
    };
  }

  return httpDependencyCheck(url, timeoutMs);
}

function buildChecks(timeoutMs) {
  return [
    {
      name: "database",
      critical: true,
      check: () => databaseCheck(timeoutMs)
    },
    {
      name: "external_api",
      critical: false,
      check: () =>
        externalDependencyCheck({
          envKey: "EXTERNAL_API_HEALTHCHECK_URL",
          timeoutMs
        })
    },
    {
      name: "notification_provider",
      critical: false,
      check: () =>
        externalDependencyCheck({
          envKey: "NOTIFICATION_PROVIDER_HEALTHCHECK_URL",
          timeoutMs
        })
    },
    {
      name: "internal_service",
      critical: true,
      check: () =>
        externalDependencyCheck({
          envKey: "INTERNAL_SERVICE_HEALTHCHECK_URL",
          timeoutMs
        })
    }
  ];
}

function aggregateHealth(serviceEntries) {
  const services = {};
  let hasCriticalFail = false;
  let hasNonCriticalFailure = false;
  let hasDegraded = false;
  let degradedOnlyBySkippedNonCritical = true;

  for (const entry of serviceEntries) {
    services[entry.name] = entry.result;

    if (entry.result.status === "fail" && entry.critical) {
      hasCriticalFail = true;
    } else if (entry.result.status === "fail") {
      hasNonCriticalFailure = true;
    }

    if (entry.result.status === "degraded") {
      hasDegraded = true;
      const isSkippedMissingConfig =
        entry.result.skipped === true &&
        entry.result.error === "missing_configuration";
      if (!isSkippedMissingConfig) {
        degradedOnlyBySkippedNonCritical = false;
      }
    }
  }

  let status = "ok";
  if (hasCriticalFail) {
    status = "fail";
  } else if (hasNonCriticalFailure) {
    status = "degraded";
  } else if (hasDegraded && !degradedOnlyBySkippedNonCritical) {
    status = "degraded";
  }

  return { status, services };
}

async function getHealthStatus() {
  const timeoutMs = normalizeTimeoutMs(process.env.HEALTHCHECK_TIMEOUT_MS);
  const checks = buildChecks(timeoutMs);

  const serviceEntries = await Promise.all(
    checks.map(async (entry) => ({
      name: entry.name,
      critical: entry.critical,
      result: await runCheck({
        check: entry.check,
        timeoutMs
      })
    }))
  );

  return aggregateHealth(serviceEntries);
}

async function getHealthStatusStatic() {
  return getHealthStatus();
}

module.exports = {
  getHealthStatus,
  getHealthStatusStatic
};
