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

    // 1. Convert userA, userB, createdBy if they are strings
    for (const field of ["userA", "userB", "createdBy"]) {
      if (typeof doc[field] === "string") {
        try {
          update[field] = new mongoose.Types.ObjectId(doc[field]);
        } catch {
          console.warn(`Skipping invalid ${field} value: ${doc[field]} in chat ${doc._id}`);
        }
      }
    }

    // 2. Handle participants array
    let currentParticipants = doc.participants || [];
    let participantsChanged = false;

    if (Array.isArray(currentParticipants)) {
      const newParticipants = currentParticipants.map((p) => {
        if (typeof p === "string") {
          try {
            participantsChanged = true;
            return new mongoose.Types.ObjectId(p);
          } catch {
            console.warn(`Skipping invalid participant value: ${p} in chat ${doc._id}`);
            return p;
          }
        }
        return p;
      });
      if (participantsChanged) {
        update.participants = newParticipants;
        currentParticipants = newParticipants;
      }
    }

    // 3. Populate participants from userA/userB if missing or empty
    if (currentParticipants.length === 0) {
      const uA = update.userA || doc.userA;
      const uB = update.userB || doc.userB;

      if (uA && uB) {
        try {
          // Ensure they are ObjectIds for sorting
          const oidA = typeof uA === "string" ? new mongoose.Types.ObjectId(uA) : uA;
          const oidB = typeof uB === "string" ? new mongoose.Types.ObjectId(uB) : uB;

          const sorted = [oidA, oidB].sort((a, b) => a.toString().localeCompare(b.toString()));
          update.participants = sorted;
          update.userA = sorted[0];
          update.userB = sorted[1];
          if (doc.isGroup === undefined) update.isGroup = false;
        } catch (e) {
          console.warn(`Failed to populate participants for chat ${doc._id}: ${e.message}`);
        }
      }
    }

    // 4. Convert lastMessage.senderId if it's a string
    if (doc.lastMessage && typeof doc.lastMessage.senderId === "string") {
      try {
        update["lastMessage.senderId"] = new mongoose.Types.ObjectId(doc.lastMessage.senderId);
      } catch {
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
        } catch {
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
