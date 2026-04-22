import * as emoji from "node-emoji";

/**
 * Normalizes an emoji character into a canonical slug (shortcode).
 *
 * This utility acts as the backend source of truth for emoji metadata,
 * ensuring that regardless of which library a frontend client uses,
 * the database stores a consistent, standardized name.
 *
 * @param unicode - The raw emoji character (e.g., "👍")
 * @param clientSlug - Optional slug provided by the client (used as fallback)
 * @returns A canonical slug string (e.g., "thumbsup")
 */
export const getCanonicalSlug = (unicode: string, clientSlug?: string): string => {
  if (!unicode) return clientSlug?.replace(/:/g, "") || "";

  // Attempt to find the canonical name from the backend registry
  // node-emoji.which returns the primary name (shortcode) for the emoji
  const canonicalName = emoji.which(unicode);

  if (canonicalName) {
    return canonicalName;
  }

  // Fallback: If not found in our registry, sanitize and use the client-provided slug
  if (clientSlug) {
    // Remove colons if the client sent a :shortcode: format
    return clientSlug.replace(/:/g, "");
  }

  // Final fallback if no metadata exists
  return "emoji";
};

const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

/**
 * Extracts all emojis from a message body and returns a dictionary of their canonical slugs.
 * Used to inject `emojiMetadata` into message DTOs so the frontend doesn't need to load
 * a large emoji name library.
 */
export const extractEmojiMetadata = (contentBody: string): Record<string, string> | undefined => {
  if (!contentBody) return undefined;

  const matches = contentBody.match(EMOJI_REGEX);

  if (!matches || matches.length === 0) return undefined;

  const metadata: Record<string, string> = {};
  for (const char of matches) {
    if (!metadata[char]) {
      metadata[char] = getCanonicalSlug(char);
    }
  }

  return metadata;
};
