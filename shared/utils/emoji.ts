import { DISALLOWED_EMOJIS } from "../constants/chat.js";

/**
 * Finds and returns any disallowed emojis present in the text.
 */
export function getDisallowedEmojis(text: string): string[] {
  if (!text) return [];

  const found = new Set<string>();
  const disallowedSet = new Set(DISALLOWED_EMOJIS);

  // Check for the common case: single emoji character
  if (disallowedSet.has(text)) {
    return [text];
  }

  // Unicode-aware regex to find all emojis in the text
  const emojis = text.match(/\p{Extended_Pictographic}/gu) || [];
  for (const emoji of emojis) {
    if (disallowedSet.has(emoji)) {
      found.add(emoji);
    }
  }

  return Array.from(found);
}
