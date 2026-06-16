/**
 * Temporary connectivity check for Jina APIs (Phase 5J.3C.2).
 * Usage: node scripts/test-jina-connection.js
 * Never prints JINA_API_KEY.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ENV_LOCAL = path.join(ROOT, ".env.local");

function loadEnvLocal() {
  if (!process.env.JINA_API_KEY && fs.existsSync(ENV_LOCAL)) {
    const text = fs.readFileSync(ENV_LOCAL, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

function previewText(text, max = 300) {
  if (typeof text !== "string") return "";
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max)}…`;
}

function errorDetails(error) {
  if (!error) return { code: "", message: "" };
  const code = error.code || error.cause?.code || "";
  const message = error.message || String(error);
  const cause = error.cause?.message ? ` | cause: ${error.cause.message}` : "";
  return { code, message: `${message}${cause}` };
}

async function probe(label, url, options = {}) {
  console.log(`\n=== ${label} ===`);
  console.log(`target URL: ${url}`);
  console.log(`method: ${options.method || "GET"}`);

  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000),
    });
    const contentType = response.headers.get("content-type") || "(none)";
    const bodyText = await response.text();

    console.log(`HTTP status: ${response.status}`);
    console.log(`response content-type: ${contentType}`);
    console.log(`elapsed ms: ${Date.now() - started}`);
    console.log(`response preview: ${previewText(bodyText)}`);

    return { ok: response.ok, status: response.status, contentType, bodyText };
  } catch (error) {
    const { code, message } = errorDetails(error);
    console.log(`HTTP status: (no response)`);
    console.log(`response content-type: (none)`);
    console.log(`elapsed ms: ${Date.now() - started}`);
    console.log(`error code: ${code || "(none)"}`);
    console.log(`error message: ${message}`);
    return { ok: false, error: { code, message } };
  }
}

async function main() {
  loadEnvLocal();

  const apiKey = typeof process.env.JINA_API_KEY === "string" ? process.env.JINA_API_KEY.trim() : "";
  const hasKey = Boolean(apiKey) && apiKey !== "PASTE_JINA_KEY_HERE";

  console.log("Jina connectivity probe");
  console.log(`hasKey: ${hasKey}`);
  console.log(`env file loaded: ${fs.existsSync(ENV_LOCAL)}`);

  if (!hasKey) {
    console.log("\nNo usable JINA_API_KEY found. Set it in .env.local and retry.");
    process.exitCode = 1;
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  await probe("Jina docs (api.jina.ai)", "https://api.jina.ai/docs", {
    method: "GET",
    headers: { Accept: "text/html,application/json" },
  });

  await probe("Embeddings auth probe (api.jina.ai/v1/embeddings)", "https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      ...authHeaders,
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      input: ["interior pendant light test"],
      task: "retrieval.query",
    }),
  });

  await probe("Web search SERP (s.jina.ai) — same as JinaProvider", "https://s.jina.ai/", {
    method: "POST",
    headers: {
      ...authHeaders,
      Accept: "application/json",
    },
    body: JSON.stringify({
      q: "modern pendant light interior design product",
      num: 3,
      hl: "ru",
      gl: "ru",
    }),
  });

  await probe("Web search SERP (s.jina.ai) — Accept text/markdown", "https://s.jina.ai/", {
    method: "POST",
    headers: {
      ...authHeaders,
      Accept: "text/markdown",
    },
    body: JSON.stringify({
      q: "modern pendant light interior design product",
      num: 3,
    }),
  });

  console.log("\nDone.");
}

main().catch((error) => {
  const { code, message } = errorDetails(error);
  console.error("Fatal:", code || "(none)", message);
  process.exitCode = 1;
});
