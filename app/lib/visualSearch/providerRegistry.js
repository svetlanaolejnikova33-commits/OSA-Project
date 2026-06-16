import { PROVIDER_IDS } from "./VisualSearchProvider";
import { createGoogleLensProvider } from "./providers/GoogleLensProvider";
import { createJinaProvider } from "./providers/JinaProvider";
import { createMockProvider } from "./providers/MockProvider";

function asString(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Resolve active provider id.
 */
export function resolveProviderId(explicitProvider) {
  const requested = asString(explicitProvider);
  if (
    requested === PROVIDER_IDS.MOCK ||
    requested === PROVIDER_IDS.JINA ||
    requested === PROVIDER_IDS.GOOGLE_LENS
  ) {
    return requested;
  }
  if (requested && process.env.NODE_ENV === "development") {
    return requested;
  }
  return asString(process.env.VISUAL_SEARCH_PROVIDER) || PROVIDER_IDS.MOCK;
}

export function createVisualSearchProvider(providerId) {
  const id = asString(providerId) || PROVIDER_IDS.MOCK;
  if (id === PROVIDER_IDS.GOOGLE_LENS) {
    return createGoogleLensProvider();
  }
  if (id === PROVIDER_IDS.JINA) {
    return createJinaProvider();
  }
  return createMockProvider();
}

/**
 * Ordered fallback chain for a requested primary provider.
 */
export function getProviderFallbackChain(primaryId) {
  const primary = asString(primaryId) || PROVIDER_IDS.MOCK;
  if (primary === PROVIDER_IDS.GOOGLE_LENS) {
    return [PROVIDER_IDS.GOOGLE_LENS, PROVIDER_IDS.JINA, PROVIDER_IDS.MOCK];
  }
  if (primary === PROVIDER_IDS.JINA) {
    return [PROVIDER_IDS.JINA, PROVIDER_IDS.MOCK];
  }
  return [PROVIDER_IDS.MOCK];
}

/** @deprecated use getProviderFallbackChain */
export function getProviderChain(primaryId) {
  const chain = getProviderFallbackChain(primaryId);
  return {
    primary: createVisualSearchProvider(chain[0]),
    fallback: createVisualSearchProvider(chain[chain.length - 1]),
    chain,
  };
}
