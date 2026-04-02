---
description: A workflow to execute the heavy-load and traversal performance test constraint.
---

# User Chat Traversal Performance Test

This workflow validates the performance constraints under heavy user load. Run this whenever modifying chat history traversal or message fetching logic.

## Prerequisites
- A local or staging instance of the `user-chat` backend running.
- Access to the testing database.

## Step 1: Data Seeding
1. Register 100 new users with random names and emails.
2. Select 10 random users and programmatically initiate chats with 10 other random users each.
3. Simulate back-and-forth messaging to generate exactly 1000 messages per chat.

## Step 2: History Window Constraint Validation
1. Verify that the initial fetch for a chat only returns the most recent 100 messages.
2. Verify that top/bottom traversal pagination correctly fetches older/newer messages without memory bloat.

## Step 3: Scroll & Traversal Stress Test
1. Act as 10 concurrent users.
2. Randomly traverse messages in top and bottom directions.
3. Scroll up between 500 to 1000 messages deep, and iteratively scroll down up to half of the top traversal depth.
4. Trigger the "Jump to Latest" action mid-scroll.
5. **Validation**: Confirm the jump action correctly fetches the latest 100-message window and clears the local historical buffer.
6. Verify UI correctly displays the date labels for messages during traversal.

## Step 4: Metric Logging
1. Record the average traversal request latency per user.
2. Compare the results against previous runs.
3. **If any optimization was done**: Provide a strict `Before | After` latency report detailing the measurable improvements.
