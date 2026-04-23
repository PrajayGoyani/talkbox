import { userCacheService } from "@services/user-cache.service";
import { Request, Response, NextFunction } from "express";

import { verifyAccessToken } from "../utils/jwt";

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required. No token provided." });
  }

  try {
    const decoded = verifyAccessToken(token) as { id: string };
    const user = await userCacheService.getUser(decoded.id);

    if (!user) {
      return res.status(403).json({ message: "User no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}
