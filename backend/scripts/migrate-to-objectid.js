/**
 * One-time migration: Convert String fields to ObjectId in Chat and Message collections.
 * Run with: node migrate-to-objectid.js
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // ─── Migrate Chats ───────────────────────────────────────────────
  const chats = db.collection("chats");
  const chatDocs = await chats.find({}).toArray();
  let chatUpdated = 0;

  for (const doc of chatDocs) {
    const update = {};

    // Convert userA, userB, createdBy if they are strings
    for (const field of ["userA", "userB", "createdBy"]) {
      if (typeof doc[field] === "string") {
        try {
          update[field] = new mongoose.Types.ObjectId(doc[field]);
        } catch (_e) {
          console.warn(`Skipping invalid ${field} value: ${doc[field]} in chat ${doc._id}`);
        }
      }
    }

    // Convert lastMessage.senderId if it's a string
    if (doc.lastMessage && typeof doc.lastMessage.senderId === "string") {
      try {
        update["lastMessage.senderId"] = new mongoose.Types.ObjectId(doc.lastMessage.senderId);
      } catch (_e) {
        console.warn(`Skipping invalid lastMessage.senderId in chat ${doc._id}`);
      }
    }

    if (Object.keys(update).length > 0) {
      await chats.updateOne({ _id: doc._id }, { $set: update });
      chatUpdated++;
    }
  }
  console.log(`Chats migrated: ${chatUpdated}/${chatDocs.length}`);

  // ─── Migrate Messages ────────────────────────────────────────────
  const messages = db.collection("messages");
  const msgDocs = await messages.find({}).toArray();
  let msgUpdated = 0;

  for (const doc of msgDocs) {
    const update = {};

    for (const field of ["chatId", "senderId"]) {
      if (typeof doc[field] === "string") {
        try {
          update[field] = new mongoose.Types.ObjectId(doc[field]);
        } catch (_e) {
          console.warn(`Skipping invalid ${field} value: ${doc[field]} in message ${doc._id}`);
        }
      }
    }

    if (Object.keys(update).length > 0) {
      await messages.updateOne({ _id: doc._id }, { $set: update });
      msgUpdated++;
    }
  }
  console.log(`Messages migrated: ${msgUpdated}/${msgDocs.length}`);

  await mongoose.connection.close();
  console.log("Migration complete. Connection closed.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
