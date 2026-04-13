import { app } from "../app";
import authRoutes from "./auth.routes";
import chatRoutes from "./chat.routes";
import notificationRoutes from "./notification.routes";
import userRoutes from "./user.routes";

// define route endpoints
export function registerRoutes() {
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/notifications", notificationRoutes);
}
