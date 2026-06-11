/**
 * Maps a free-form user intent (text or future voice transcript)
 * to an internal design mutation for the existing generation pipeline.
 * UI stays human-facing; prompt assembly remains server-side / platform-side.
 */

import { getConceptDNA } from "./styleConsistencyUtils";

const INTENT_HINTS = [
  { tokens: ["тепл", "теплее", "уют", "warm"], mutationId: "mutation_warm_shift" },
  { tokens: ["текстил", "декор", "штор", "освеж"], mutationId: "mutation_textile_decor_refresh" },
  { tokens: ["бюджет", "дешев", "эконом", "смет"], mutationId: "mutation_budget_optimization" },
  { tokens: ["современ", "актуальн", "contemporary", "modern"], mutationId: "mutation_contrast_boost" },
  { tokens: ["лаконич", "минимал", "проще", "чище"], mutationId: "mutation_minimal_cleanup" },
  { tokens: ["мягч", "спокойн", "смягч"], mutationId: "mutation_softening" },
  { tokens: ["премиум", "дорог", "luxury"], mutationId: "mutation_premium_upgrade" },
  { tokens: ["контраст", "выразит"], mutationId: "mutation_contrast_boost" },
  { tokens: ["светильник", "люстр", "ламп", "освещ"], mutationId: "mutation_textile_decor_refresh" },
  { tokens: ["дерев", "wood"], mutationId: "mutation_premium_upgrade" },
  { tokens: ["материал"], mutationId: "mutation_premium_upgrade" },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIntentText(value) {
  return asString(value).toLowerCase().replace(/\s+/g, " ");
}

function uniqueStrings(values, limit = 8) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = asString(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function collectPreserveDNA(semanticDraft) {
  const conceptDNA = getConceptDNA(semanticDraft?.styleConsistency);
  return uniqueStrings(
    [
      ...asArray(semanticDraft?.styleConsistency?.mustPreserve),
      ...asArray(semanticDraft?.specAnalysis?.whatMustBePreserved),
      ...asArray(semanticDraft?.proAnalysis?.designIntent?.whatMustBePreserved),
      conceptDNA.compositionCore,
      conceptDNA.styleCore,
      conceptDNA.colorCore,
      "композиция",
      "ракурс",
      "планировка",
    ],
    8,
  );
}

function scoreMutationForIntent(intentText, mutation) {
  if (!mutation || typeof mutation !== "object") return 0;
  const haystack = normalizeIntentText(
    [mutation.labelRu, mutation.goalRu, mutation.noteRu, ...(mutation.changeTargets || [])].join(" "),
  );
  if (!haystack || !intentText) return 0;

  let score = 0;
  const intentWords = intentText.split(/[^a-zа-яё0-9]+/i).filter((word) => word.length > 3);
  for (const word of intentWords) {
    if (haystack.includes(word)) score += 3;
  }
  if (haystack.includes(intentText)) score += 12;

  for (const hint of INTENT_HINTS) {
    const matchesIntent = hint.tokens.some((token) => intentText.includes(token));
    if (!matchesIntent) continue;
    if (mutation.id === hint.mutationId) score += 14;
    if (hint.tokens.some((token) => haystack.includes(token))) score += 4;
  }

  return score;
}

/**
 * @param {string} userIntent
 * @param {object|null|undefined} semanticDraft
 */
export function resolveConceptIntentMutation(userIntent, semanticDraft) {
  const intentText = normalizeIntentText(userIntent);
  if (!intentText) return null;

  const mutations = asArray(semanticDraft?.designMutations);
  let best = null;
  let bestScore = 0;

  for (const mutation of mutations) {
    const score = scoreMutationForIntent(intentText, mutation);
    if (score > bestScore) {
      bestScore = score;
      best = mutation;
    }
  }

  if (best && bestScore >= 4) {
    return {
      ...best,
      goalRu: userIntent,
      promptTemplateRu: [
        asString(best.promptTemplateRu),
        `Намерение пользователя: ${userIntent}.`,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  return buildUserIntentMutation(userIntent, semanticDraft);
}

/**
 * Fallback mutation when no heuristic card matches well.
 * @param {string} userIntent
 * @param {object|null|undefined} semanticDraft
 */
export function buildUserIntentMutation(userIntent, semanticDraft) {
  const intent = asString(userIntent);
  if (!intent) return null;

  const preserveDNA = collectPreserveDNA(semanticDraft);
  const slug = intent
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return {
    id: `mutation_user_intent_${slug || "custom"}`,
    labelRu: intent.length > 72 ? `${intent.slice(0, 69)}…` : intent,
    mutationType: "style_shift",
    goalRu: intent,
    preserveDNA,
    changeTargets: uniqueStrings(
      [
        intent.toLowerCase().includes("свет") ? "освещение" : "",
        intent.toLowerCase().includes("текстил") ? "текстиль" : "",
        intent.toLowerCase().includes("материал") ? "материалы" : "",
        intent.toLowerCase().includes("бюджет") ? "смета" : "",
        "акценты",
      ].filter(Boolean),
      6,
    ),
    affectedEditableObjects: [],
    affectedSpecGroups: [],
    styleImpact: "medium",
    budgetImpact: "medium",
    riskLevel: "low",
    promptTemplateRu: `Сохрани композицию, ракурс, планировку и ключевые объекты сцены. ${intent}`,
    noteRu: "Сформировано из запроса пользователя.",
    confidence: 0.55,
  };
}

/**
 * Normalized payload for future voice assistant integration.
 * @param {string} userIntent
 * @param {object|null|undefined} semanticDraft
 */
export function buildConceptIntentRequest(userIntent, semanticDraft) {
  const intent = asString(userIntent);
  const mutation = resolveConceptIntentMutation(intent, semanticDraft);
  return {
    channel: "text",
    userIntent: intent,
    mutation,
    preparedAt: new Date().toISOString(),
  };
}
