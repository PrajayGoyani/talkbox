import { connectDB } from "@config/db";
import { BCRYPT_SALT } from "@config/env";
import Chat from "@models/chat.model";
import User from "@models/user.model";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const TEST_USERNAME = "user1";
const DUMMY_PREFIX = "test_dummy_";
const DUMMY_COUNT = 30;

async function cleanup() {
  console.log("Cleaning up previous test data...");
  const dummyUsers = await User.find({ username: new RegExp(`^${DUMMY_PREFIX}`) });
  const dummyUserIds = dummyUsers.map((u) => u._id);

  const testUser = await User.findOne({ username: TEST_USERNAME });
  if (testUser) {
    // Delete chats involving test user and dummies
    await Chat.deleteMany({
      participants: testUser._id,
    });
  }

  // Delete dummy users
  await User.deleteMany({ _id: { $in: dummyUserIds } });
  console.log(`Deleted ${dummyUserIds.length} dummy users and their chats.`);
}

async function seed() {
  try {
    await connectDB();

    // Always cleanup first for a clean state
    await cleanup();

    if (process.argv.includes("--cleanup-only")) {
      process.exit(0);
    }

    console.log(`Seeding 30 chats for ${TEST_USERNAME}...`);

    let user = await User.findOne({ username: TEST_USERNAME });
    if (!user) {
      console.log(`Creating user ${TEST_USERNAME}...`);
      const hashedPassword = await bcrypt.hash("password123", BCRYPT_SALT);
      user = await User.create({
        username: TEST_USERNAME,
        email: `${TEST_USERNAME}@example.com`,
        password: hashedPassword,
        name: "Test User One",
        plan: "pro",
      });
    }

    const startTimestamp = Date.now();

    for (let i = 1; i <= DUMMY_COUNT; i++) {
      const dummyUsername = `${DUMMY_PREFIX}${i}`;
      const dummyEmail = `${dummyUsername}@example.com`;

      const dummyUser = await User.create({
        username: dummyUsername,
        email: dummyEmail,
        password: "no-access-password", // Not needed for testing
        name: `Dummy User ${i}`,
        plan: "free",
      });

      // Create accepted chat
      const aId = new ObjectId(user._id as any);
      const bId = new ObjectId(dummyUser._id as any);
      const participants = [aId, bId].sort((a, b) => a.toString().localeCompare(b.toString()));
      const [uA, uB] = participants;

      // Stagger sentAt by 1 hour increments to test sorting
      // dummy 1 will be most recent, dummy 30 oldest
      const sentAt = new Date(startTimestamp - i * 3600000);

      await Chat.create({
        participants,
        createdBy: bId, // Created by dummy
        status: "accepted",
        lastMessage: {
          messageId: null, // message doesn't exist yet in this seeder
          contentBody: `Hello from Dummy ${i}! This is a test message.`,
          senderId: bId,
          sentAt: sentAt,
        },
        createdAt: sentAt,
      });

      if (i % 10 === 0) console.log(`Created ${i}/${DUMMY_COUNT} chats...`);
    }

    console.log("\nSeeding completed successfully!");
    console.log(`- Login as: ${TEST_USERNAME}`);
    console.log("- Password: password123");
    console.log("\nRun with --cleanup-only to revert.");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

void seed();
