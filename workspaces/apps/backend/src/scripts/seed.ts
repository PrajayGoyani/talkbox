/* eslint-disable no-console, no-unused-vars */
import { connectDB } from "@config/db";
import Chat from "@models/chat.model";
import Message from "@models/message.model";
import User from "@models/user.model";
import { Types } from "mongoose";

const DEMO_PASSWORD = Bun.env.DEMO_PASSWORD || "password123";

const demoUsers = [
  {
    username: "demo_alice",
    name: "Alice Smith",
    email: "alice@example.com",
    password: DEMO_PASSWORD,
  },
  {
    username: "demo_bob",
    name: "Bob Jones",
    email: "bob@example.com",
    password: DEMO_PASSWORD,
  },
  {
    username: "demo_charlie",
    name: "Charlie Brown",
    email: "charlie@example.com",
    password: DEMO_PASSWORD,
  },
];

const genericMessages = [
  "Hey, how are you doing?",
  "Did you see the new update?",
  "I'm working on the seeder script right now.",
  "That sounds interesting!",
  "Let me know if you need any help.",
  "I'll be online in an hour.",
  "Check out this cool feature!",
  "Have a great day!",
];

async function seed() {
  try {
    await connectDB();
    console.log("Seeding started...");

    // 1. Create Users
    const createdUsers: any[] = [];
    for (const userData of demoUsers) {
      let user = await User.findOne({ username: userData.username });
      if (!user) {
        user = new User(userData);
        await user.save();
        console.log(`User created: ${userData.username}`);
      } else {
        console.log(`User already exists: ${userData.username}`);
      }
      if (user) createdUsers.push(user);
    }

    const [alice, bob, charlie] = createdUsers;

    // 2. Create Chats
    const pairs = [
      [alice, bob],
      [alice, charlie],
      [bob, charlie],
    ];

    for (const [userA, userB] of pairs as any[][]) {
      const aId = userA._id;
      const bId = userB._id;

      // Consistent ordering for unique constraint
      const participants = [new Types.ObjectId(aId), new Types.ObjectId(bId)].sort((a, b) =>
        a.toString().localeCompare(b.toString()),
      );

      const [uidA, uidB] = participants;

      let chat = await Chat.findOne({ participants: { $all: [uidA, uidB] }, isGroup: false });
      if (!chat) {
        chat = await Chat.create({
          participants,
          isGroup: false,
          createdBy: uidA, // Arbitrary
          status: "accepted",
        });
        console.log(`Chat created between ${userA.username} and ${userB.username}`);
      } else if (chat.status !== "accepted") {
        chat.status = "accepted";
        await chat.save();
        console.log(`Chat status updated to accepted for ${userA.username} and ${userB.username}`);
      } else {
        console.log(`Accepted chat already exists for ${userA.username} and ${userB.username}`);
      }

      // 3. Create Messages (3 from each side)
      const messageCount = await Message.countDocuments({ chatId: chat._id });
      if (messageCount === 0) {
        for (let i = 0; i < 3; i++) {
          // Message from userA
          const contentA = genericMessages[Math.floor(Math.random() * genericMessages.length)];
          const msgA = await Message.create({
            chatId: chat._id,
            senderId: userA._id,
            contentBody: contentA,
            idempotencyKey: `${chat._id.toString()}_${userA._id.toString()}_${i}_${Date.now()}_A`,
          });

          // Message from userB
          const contentB = genericMessages[Math.floor(Math.random() * genericMessages.length)];
          const msgB = await Message.create({
            chatId: chat._id,
            senderId: userB._id,
            contentBody: contentB,
            idempotencyKey: `${chat._id.toString()}_${userB._id.toString()}_${i}_${Date.now()}_B`,
          });

          // Update chat last message
          chat.lastMessage = {
            messageId: msgB._id as any,
            contentBody: contentB,
            senderId: userB._id,
            sentAt: msgB.createdAt,
          };
        }
        await chat.save();
        console.log(`Messages seeded for chat ${chat._id.toString()}`);
      } else {
        console.log(`Messages already exist for chat ${chat._id.toString()}`);
      }
    }

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

void seed();
