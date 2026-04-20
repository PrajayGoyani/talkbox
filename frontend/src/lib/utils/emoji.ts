export const DISALLOWED_EMOJIS = new Set(["💩", "💋", "🫦"]);

// Cache the regex for performance (compiled once at module load)
const DISALLOWED_REGEX = new RegExp([...DISALLOWED_EMOJIS].join("|"), "gu");

export interface EmojiSegment {
  type: "text" | "emoji";
  content: string;
  name?: string;
}

export const segmenter =
  typeof Intl?.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

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
  if (segmenter) {
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

/**
 * Returns the canonical name (shortcode) for a given emoji character.
 * Because we removed node-emoji from the frontend to save 500kb bundle size,
 * we now rely on the backend to inject `emojiMetadata` into the message DTO.
 */
export function getEmojiName(char: string, dict?: Record<string, string>): string {
  if (dict && dict[char]) {
    return dict[char];
  }
  return "emoji";
}

/**
 * Parses message text into segments of plain text and emojis.
 * This enables per-emoji tooltips and rich rendering.
 */
export function parseMessageContent(text: string, emojiDict?: Record<string, string>): EmojiSegment[] {
  if (!text) return [];

  const segments: EmojiSegment[] = [];

  // Use Intl.Segmenter for accurate grapheme splitting (handles multi-char emojis)
  if (!segmenter) {
    // Basic fallback for environments without Segmenter
    segments.push({ type: "text", content: text });
    return segments;
  }

  const it = segmenter.segment(text);

  let currentText = "";

  for (const seg of it) {
    const char = seg.segment;
    // Check if segment is an emoji
    if (EMOJI_REGEX.test(char)) {
      if (currentText) {
        segments.push({ type: "text", content: currentText });
        currentText = "";
      }
      segments.push({
        type: "emoji",
        content: char,
        name: getEmojiName(char, emojiDict),
      });
    } else {
      currentText += char;
    }
  }

  if (currentText) {
    segments.push({ type: "text", content: currentText });
  }

  return segments;
}
