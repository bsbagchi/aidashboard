const MAX_DEFAULT = 8000;

/**
 * Strip obvious script payloads and cap length for LLM inputs.
 */
export function sanitizeUserText(input: string, maxLen = MAX_DEFAULT): string {
  let s = input.trim().slice(0, maxLen);
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  s = s.replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return s;
}
