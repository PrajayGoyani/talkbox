import authRoutes from "@routes/auth.routes";
import chatRoutes from "@routes/chat.routes";
import notificationRoutes from "@routes/notification.routes";
import publicRoutes from "@routes/public.routes";
import userRoutes from "@routes/user.routes";

import { app } from "@/app";

// define route endpoints
export function registerRoutes() {
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/public", publicRoutes);
}
