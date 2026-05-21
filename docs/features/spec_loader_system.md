# Engaging Loader & Dynamic Quote System

This document outlines the implementation and future roadmap for the engaging loading screen in **Talkbox**. This system is designed to improve perceived performance during slow server boot-ups by providing users with curated quotes, pro-tips, and announcements.

## Overview

When the application detects a slow backend response (e.g., during a cold start or heavy load), it replaces the standard spinner with an "Engaging Loader." This loader features a randomized quote and a subtle "Booting Server" animation.

### 1. Conditional Configuration

The loader is controlled by an environment-aware flag in `config.ts`:

- **Flag**: `VITE_SHOW_ENGAGING_LOADER`
- **Toggle**: Set to `false` in `.env` to revert to the simple "Please wait..." message.
- **Default**: `true`

```typescript
// frontend/src/lib/config.ts
export const SHOW_ENGAGING_LOADER = getBoolEnv("VITE_SHOW_ENGAGING_LOADER", true);
```

### 2. Implementation Strategy

The system uses a "Hybrid" approach for maximum reliability and engagement:

1.  **Instant Feedback (Static Fallback)**: A curated list of quotes and tips is hardcoded in `App.svelte`. As soon as `authStore.isSlowBoot` becomes true, a random item from this list is displayed instantly.
2.  **Dynamic Upgrade (Backend Prototype)**: The frontend then attempts to "upgrade" this content by fetching a fresh quote or announcement from the backend.

#### Backend Components (Prototype)

- **Model**: `Quote` model in `src/models/quote.model.ts` supporting categories (`motivation`, `tip`, `announcement`) and an `active` flag.
- **Endpoint**: `GET /api/public/quote` returns a random active quote from the database.
- **Registration**: Routes are registered under the `/api/public` prefix.

#### Frontend Logic

The `fetchDynamicQuote` function in `App.svelte` handles the background upgrade:

```typescript
async function fetchDynamicQuote() {
  try {
    const response = await fetch(`${API_BASE}/public/quote`);
    const res = await response.json();
    if (res.success && res.data) {
      currentQuote = res.data;
    }
  } catch (e) {
    // Graceful fallback to static list if backend is still booting
    console.warn("Failed to fetch dynamic quote", e);
  }
}
```

## Future Recommendations

| Approach            | Implementation                                                        | Best For                                                                                                  |
| :------------------ | :-------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Backend Service** | (Implemented as Prototype) Pull from a dedicated `quotes` collection. | **Branded Content**: Curating quotes that mention "Talkbox" or including specific app tips/announcements. |
| **Public API**      | Fetch from external services like `api.quotable.io`.                  | **Variety**: Provides thousands of quotes with zero maintenance effort.                                   |
| **Remote Config**   | Host a static `quotes.json` on a Gist or S3 bucket.                   | **Easy Updates**: Change content without redeploying backend or frontend.                                 |

### Suggested Scaling Path

1.  **Priority System**: Add a `priority` field to the `Quote` model. Critical announcements (e.g., "Server maintenance in 30 mins") should always take precedence over general tips.
2.  **Display Intervals**: Implement `validFrom` and `validUntil` dates to automate seasonal quotes or time-sensitive announcements.
3.  **Rotation Logic**: If the boot time is exceptionally long, implement a timer to cycle through multiple quotes every 10-15 seconds.

## Development Note: Testing Flag

For UI verification, the `BOOT_TIMEOUT_MS` or the initial auth check in `auth.svelte.ts` can be temporarily increased (e.g., to 50,000ms). **Ensure this is reverted to a lower value (e.g., 3000ms for slow boot detection) before production deployment.**
