import { userCacheService } from "@services/user-cache.service";
import { verifyAccessToken } from "@utils/jwt";
import { NextFunction, Request, Response } from "express";

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // Fallback to cookie if header is missing (for CORS-friendly GET requests)
  if (!token && req.cookies) {
    token = req.cookies.access_token;
  }

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
  } catch {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}
