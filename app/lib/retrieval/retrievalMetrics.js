export function recallAtK({ retrievedArticles, goldArticle }) {
  if (!goldArticle) return { metric: "Recall@K", value: "unavailable_no_gold_set" };
  return { metric: "Recall@K", value: retrievedArticles.includes(goldArticle) ? 1 : 0 };
}
