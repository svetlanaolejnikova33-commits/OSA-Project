import {
  LIVE_POV_CONFIGURATION_ERROR,
  createLivePovNavigator,
  validateLivePovRetrievalCandidates,
} from "../../../app/lib/ccn/validateLivePovRetrievalCandidates.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const candidate = {
  rank: 1,
  manufacturer_id: "registry-manufacturer",
  article: "LIVE-A",
  product: { official_url: "https://official.example/product/live-a" },
};
const liveEnv = { OSA_CCN_LIVE: "1", OSA_CCN_BROWSER_ENV: "LOCAL" };

let navigatorCalls = 0;
let configurationError = null;
try {
  const navigator = createLivePovNavigator({
    env: { OSA_CCN_LIVE: "0", OSA_CCN_BROWSER_ENV: "LOCAL" },
    navigator: async () => {
      navigatorCalls += 1;
      throw new Error("must not run");
    },
  });
  await validateLivePovRetrievalCandidates({
    candidates: [candidate],
    vision: {},
    liveNavigator: navigator,
    env: { OSA_CCN_LIVE: "0", OSA_CCN_BROWSER_ENV: "LOCAL" },
  });
} catch (error) {
  configurationError = error;
}
assert(configurationError?.code === LIVE_POV_CONFIGURATION_ERROR, "invalid live configuration fails closed");
assert(navigatorCalls === 0, "no navigator, including default mock, is called after configuration failure");

let missingNavigatorError = null;
try {
  await validateLivePovRetrievalCandidates({
    candidates: [candidate],
    vision: {},
    env: liveEnv,
  });
} catch (error) {
  missingNavigatorError = error;
}
assert(missingNavigatorError?.code === LIVE_POV_CONFIGURATION_ERROR, "Live PoV has no default mock navigator");

const mockSource = await validateLivePovRetrievalCandidates({
  candidates: [candidate],
  vision: {},
  env: liveEnv,
  liveNavigator: async () => ({
    gate: { decision: "accept", match_confidence: 1 },
    product: { source: "CCN", article: "LIVE-A" },
  }),
});
assert(mockSource[0].ccn_g3.outcome === "needs_human", "CCN/mock source is rejected");
assert(mockSource[0].ccn_g3.decision === "fail", "CCN/mock source cannot reach acceptance");

let receivedKeys = [];
const liveSource = await validateLivePovRetrievalCandidates({
  candidates: [candidate],
  vision: { category: "fixture" },
  env: liveEnv,
  liveNavigator: async (input) => {
    receivedKeys = Object.keys(input).sort();
    return {
      gate: { decision: "accept", match_confidence: 0.93 },
      product: { source: "CCN_LIVE", article: "LIVE-A" },
    };
  },
});
assert(liveSource[0].ccn_g3.outcome === "accepted", "CCN_LIVE candidate is admitted");
assert(
  JSON.stringify(receivedKeys) === JSON.stringify(["catalog_url", "manufacturer_id", "vision"]),
  "Live PoV passes no Memory or Experience candidates",
);

console.log("Live PoV boundary fixtures passed", {
  invalid_configuration: configurationError.code,
  navigator_calls_after_failure: navigatorCalls,
  missing_navigator: missingNavigatorError.code,
  mock_source_outcome: mockSource[0].ccn_g3.outcome,
  live_source_outcome: liveSource[0].ccn_g3.outcome,
  navigator_input_keys: receivedKeys,
});