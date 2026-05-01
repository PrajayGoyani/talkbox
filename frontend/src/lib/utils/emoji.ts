import { getDisallowedEmojis as sharedGetDisallowedEmojis } from "@root/shared/utils/emoji";

export interface MessageSegment {
  type: "text" | "emoji" | "link" | "code";
  content: string;
  name?: string;
  url?: string;
}

export const segmenter =
  typeof Intl?.Segmenter === "function" ? new Intl.Segmenter("en", { granularity: "grapheme" }) : null;

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

/**
 * Finds and returns any disallowed emojis present in the text.
 * Support checking single emoji characters or full message text.
 */
export function getDisallowedEmojis(text: string): string[] {
  return sharedGetDisallowedEmojis(text);
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
 * Helper to split text segments by a regular expression and convert matches into specific types.
 */
function splitByRegex(
  segments: MessageSegment[],
  regex: RegExp,
  createSegment: (match: RegExpExecArray) => MessageSegment,
): MessageSegment[] {
  const result: MessageSegment[] = [];

  for (const segment of segments) {
    if (segment.type !== "text") {
      result.push(segment);
      continue;
    }

    let lastIndex = 0;
    let match;
    const content = segment.content;

    // Reset regex index for safety
    regex.lastIndex = 0;

    while ((match = regex.exec(content)) !== null) {
      const index = match.index;

      // Add text before match
      if (index > lastIndex) {
        result.push({
          type: "text",
          content: content.substring(lastIndex, index),
        });
      }

      // Add special segment
      result.push(createSegment(match));
      lastIndex = index + match[0].length;

      // Prevent infinite loops on zero-length matches
      if (regex.lastIndex === index) {
        regex.lastIndex++;
      }
    }

    // Add remaining text
    if (lastIndex < content.length) {
      result.push({
        type: "text",
        content: content.substring(lastIndex),
      });
    }
  }

  return result;
}

export type EmojiDisplayMode = "normal" | "jumbo-1" | "jumbo-2" | "jumbo-3";

/**
 * Parses message text into segments of plain text, emojis, links, and code blocks.
 * This enables per-emoji tooltips and high-fidelity rendering.
 */
export function parseMessageContent(
  text: string,
  emojiDict?: Record<string, string>,
  options: { richFormatting?: boolean } = { richFormatting: true },
): MessageSegment[] {
  if (!text) return [];

  let segments: MessageSegment[] = [{ type: "text", content: text }];

  // Options-based toggle for rich formatting (Developers can set this to false to disable)
  if (options.richFormatting) {
    // 1. Pass: Code blocks (backticks) - Supports escaped backticks \`
    segments = splitByRegex(segments, /`((?:\\`|[^`])+)`/g, (match) => ({
      type: "code",
      content: match[1].replace(/\\`/g, "`").trim(), // Trim removes unintended leading/trailing whitespace/newlines
    }));

    // 2. Pass: URLs (http/https)
    segments = splitByRegex(segments, /(https?:\/\/[^\s]+)/g, (match) => ({
      type: "link",
      content: match[0],
      url: match[0],
    }));
  }

  // 3. Pass: Emojis (using existing Segmenter logic)
  const finalSegments: MessageSegment[] = [];

  for (const segment of segments) {
    if (segment.type !== "text" || !segmenter) {
      finalSegments.push(segment);
      continue;
    }

    const it = segmenter.segment(segment.content);
    let currentText = "";

    for (const seg of it) {
      const char = seg.segment;
      if (EMOJI_REGEX.test(char)) {
        if (currentText) {
          finalSegments.push({ type: "text", content: currentText });
          currentText = "";
        }
        finalSegments.push({
          type: "emoji",
          content: char,
          name: getEmojiName(char, emojiDict),
        });
      } else {
        currentText += char;
      }
    }

    if (currentText) {
      finalSegments.push({ type: "text", content: currentText });
    }
  }

  return finalSegments;
}

/**
 * Determines if a message consists primarily of emojis and should be displayed in "Jumbo" mode.
 * Supports accurate counting via Intl.Segmenter with a regex fallback.
 */
export function getEmojiDisplayMode(text: string): EmojiDisplayMode {
  const trimmed = text.trim();
  if (!trimmed) return "normal";

  // Accurate emoji counting using Intl.Segmenter
  if (!segmenter) {
    const emojiOnlyRegex = /^(\p{Extended_Pictographic}|\s)+$/u;
    if (!emojiOnlyRegex.test(trimmed)) return "normal";
    const emojis = trimmed.match(/\p{Extended_Pictographic}/gu) || [];
    if (emojis.length === 1) return "jumbo-1";
    if (emojis.length === 2) return "jumbo-2";
    if (emojis.length === 3) return "jumbo-3";
    return "normal";
  }

  const segments = segmenter.segment(trimmed);
  let count = 0;

  for (const seg of segments) {
    const char = seg.segment.trim();
    if (!char) continue;
    if (EMOJI_REGEX.test(char)) {
      count++;
    } else {
      return "normal";
    }
  }

  if (count === 1) return "jumbo-1";
  if (count === 2) return "jumbo-2";
  if (count === 3) return "jumbo-3";
  return "normal";
}
