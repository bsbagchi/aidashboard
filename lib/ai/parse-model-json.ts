/**
 * Gemini sometimes wraps JSON in markdown fences or adds prose; extract parseable JSON.
 */
export function parseJsonFromModelText(raw: string): unknown {
  const t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim());
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(t.slice(start, end + 1));
  }
  return JSON.parse(t);
}
