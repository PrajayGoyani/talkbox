import Quote from "@models/quote.model";
import { Router } from "express";

import { NODE_ENV } from "@/config/env";

const router = Router();

/**
 * Public Routes (Prototype)
 *
 * This endpoint is designed to be hit by the frontend during the 'slow boot' phase.
 * It provides dynamic content to keep the user engaged while the main app initializes.
 */
router.get("/quote", async (req, res) => {
  try {
    // Simple prototype implementation: Get random active quote
    const count = await Quote.countDocuments({ active: true });

    if (count === 0) {
      // Fallback if DB is empty
      return res.json({
        success: true,
        data: {
          text: "Connect. Chat. Collaborate.",
          author: "Talkbox Team",
          category: "announcement",
        },
      });
    }

    const random = Math.floor(Math.random() * count);
    const quote = await Quote.findOne({ active: true }).skip(random);

    return res.json({
      success: true,
      data: {
        text: quote?.text,
        author: quote?.author,
        category: quote?.category,
      },
    });
  } catch (error) {
    if (NODE_ENV === "development") {
      console.error("Error in public/quote route:", error);
    }
    // Graceful fallback for the frontend to handle
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
