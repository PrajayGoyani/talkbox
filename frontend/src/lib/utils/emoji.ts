export const DISALLOWED_EMOJIS = new Set(["💩", "💋", "🫦"]);

// Cache the regex for performance (compiled once at module load)
const DISALLOWED_REGEX = new RegExp([...DISALLOWED_EMOJIS].join("|"), "gu");

/**
 * Finds and returns any disallowed emojis present in the text.
 * Support checking single emoji characters or full message text.
 */
export function getDisallowedEmojis(text: string): string[] {
  if (!text) return [];

  const found = new Set<string>();

  // Quick check for the common case: clicking a single emoji in the picker
  if (DISALLOWED_EMOJIS.has(text)) {
    return [text];
  }

  // Use Intl.Segmenter for modern environments (most accurate)
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    const segments = segmenter.segment(text);
    for (const seg of segments) {
      if (DISALLOWED_EMOJIS.has(seg.segment)) {
        found.add(seg.segment);
      }
    }
  } else {
    // Fallback using cached Unicode-aware regex
    // We reset lastIndex since we are using the 'g' flag with matchAll or match
    const matches = text.match(DISALLOWED_REGEX);
    if (matches) {
      matches.forEach((m) => found.add(m));
    }
  }

  return Array.from(found);
}
