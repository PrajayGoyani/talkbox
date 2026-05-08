import mongoose, { Document, Schema } from "mongoose";

/**
 * Quote Model (Prototype)
 * 
 * FUTURE CONSIDERATION:
 * - Add 'tags' for better filtering (e.g., #productivity, #teamwork)
 * - Add 'displayInterval' to show certain announcements only during specific times
 * - Add 'priority' to ensure critical announcements are shown more frequently
 */
export interface IQuote extends Document {
  text: string;
  author?: string;
  category: "motivation" | "tip" | "announcement";
  active: boolean;
  createdAt: Date;
}

const quoteSchema = new Schema<IQuote>({
  text: { type: String, required: true },
  author: { type: String, default: null },
  category: { 
    type: String, 
    enum: ["motivation", "tip", "announcement"], 
    default: "motivation" 
  },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Index for random selection performance
quoteSchema.index({ active: 1 });

const Quote = mongoose.model<IQuote>("Quote", quoteSchema);
export default Quote;
