import UserModel from "../../models/user.model";

export const subscriptionHandler = async () => {
  try {
    console.log("Running subscription expiry job...");
    // Downgrade all expired Pro users to Free
    const result = await UserModel.updateMany(
      {
        plan: "pro",
        subscriptionExpiresAt: { $lt: new Date() },
      },
      {
        $set: { plan: "free", subscriptionExpiresAt: null },
      },
    );
    if (result.modifiedCount > 0) {
      console.log(`Successfully downgraded ${result.modifiedCount} expired subscriptions.`);
    }
  } catch (error) {
    console.error("Error during subscription expiry job:", error);
  }
};
