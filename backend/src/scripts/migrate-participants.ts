import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Ensure process.env.MONGO_URI is set for the imported connectDB
if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
  process.env.MONGO_URI = process.env.MONGODB_URI;
}

const { connectDB } = await import("../config/db");
const { default: Chat } = await import("../models/chat.model");

async function migrate() {
  try {
    await connectDB();
    console.log("Migration started: Populating participants array and userA/B indices...");

    const chats = await Chat.find({
      $or: [{ participants: { $exists: false } }, { participants: { $size: 0 } }, { userA: { $exists: false } }],
    });

    console.log(`Found ${chats.length} chats to migrate.`);

    let updatedCount = 0;
    for (const chat of chats) {
      // Handle legacy chats where userA/userB might be the only source of truth
      // OR handle cases where they were partially migrated but missing shadow fields
      const uidA = chat.userA;
      const uidB = chat.userB;

      if (uidA && uidB) {
        // Ensure deterministic ordering (alphabetical by ID string)
        const participants = [uidA, uidB].sort((a, b) => a.toString().localeCompare(b.toString()));

        chat.userA = participants[0];
        chat.userB = participants[1];
        chat.participants = participants;
        chat.isGroup = false; // Legacy chats are all 1-to-1

        await chat.save();
        updatedCount++;
      }
    }

    console.log(`Migration completed: ${updatedCount} chats updated.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

void migrate();
