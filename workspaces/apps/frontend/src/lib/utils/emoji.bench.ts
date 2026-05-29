import { parseMessageContent } from "$utils/emoji";
import { bench, describe } from "vitest";

describe("parsing logic stress test", () => {
  const shortMessage = "Hello world! Check out https://google.com 🚀";
  const mediumMessage =
    "Check code `npm install` at https://github.com/PrajayGoyani/talkbox and some emojis 🚀🔥✨".repeat(10);
  const largeMessage =
    "System log: `error 500` at https://internal.logs/123-456. Mixed emojis 💩💋🫦 and normal text.".repeat(100);

  bench("parse short message", () => {
    parseMessageContent(shortMessage);
  });

  bench("parse medium message (~800 chars)", () => {
    parseMessageContent(mediumMessage);
  });

  bench("parse large message (~8000 chars)", () => {
    parseMessageContent(largeMessage);
  });

  bench("100x small message burst", () => {
    for (let i = 0; i < 100; i++) {
      parseMessageContent(shortMessage);
    }
  });
});
