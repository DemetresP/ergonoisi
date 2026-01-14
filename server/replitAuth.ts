import type { Express, RequestHandler } from "express";
import admin from "./firebaseAdmin";
import { storage } from "./storage";

export async function setupAuth(_app: Express) {
  // Firebase Admin is initialized in ./firebaseAdmin; nothing else required here.
  return;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = (req.headers.authorization as string) || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader || (req.cookies && (req.cookies.token as string));

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    // Attach decoded token to req.user for downstream handlers
    (req as any).user = decoded;

    // Ensure user exists in storage (upsert)
    await storage.upsertUser({
      id: decoded.uid,
      email: decoded.email || undefined,
      firstName: decoded.name ? decoded.name.split(" ").slice(0, 1).join(" ") : undefined,
      lastName: decoded.name ? decoded.name.split(" ").slice(1).join(" ") : undefined,
      profileImageUrl: decoded.picture || undefined,
    } as any);

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
