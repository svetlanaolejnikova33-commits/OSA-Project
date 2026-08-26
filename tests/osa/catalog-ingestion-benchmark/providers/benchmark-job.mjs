/**
 * In-memory BenchmarkJob helper for catalog-ingestion benchmark lab.
 * No persistence, network, keys, or gold access.
 */
export function createBenchmarkJob({ run_id, source_urls, provider_id = null, mode = "dry-run" }) {
  if (typeof run_id !== "string" || !run_id) throw new Error("INVALID_BENCHMARK_JOB: run_id required");
  if (!Array.isArray(source_urls)) throw new Error("INVALID_BENCHMARK_JOB: source_urls must be an array");
  if (mode !== "dry-run" && mode !== "live") throw new Error("INVALID_BENCHMARK_JOB: unsupported mode");
  return Object.freeze({
    mode,
    run_id,
    source_urls: Object.freeze([...source_urls]),
    provider_id,
  });
}

export function isDryRunJob(job) {
  return Boolean(job && job.mode === "dry-run" && typeof job.run_id === "string" && job.run_id && Array.isArray(job.source_urls));
}

export function isLiveJob(job) {
  return Boolean(
    job
    && job.mode === "live"
    && typeof job.run_id === "string"
    && job.run_id
    && Array.isArray(job.source_urls)
    && job.source_urls.length > 0
    && typeof job.source_urls[0] === "string"
    && job.source_urls[0],
  );
}
