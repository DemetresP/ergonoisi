import type { Express, RequestHandler } from "express";
import admin from "./firebaseAdmin";
import { storage } from "./storage";
import { isAdmin } from "@shared/admin";
import { findMemberByEmail } from "@shared/schema";

export async function setupAuth(_app: Express) {
  // Firebase Admin is initialized in ./firebaseAdmin; nothing else required here.
  return;
}

// Who is making the request, as used for permissions and the task history
export interface Actor {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
  // The team member name this user is assigned tasks under (undefined for an admin not in the team)
  memberName?: string;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  let decoded: admin.auth.DecodedIdToken;
  try {
    const authHeader = (req.headers.authorization as string) || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader || (req.cookies && (req.cookies.token as string));

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    decoded = await admin.auth().verifyIdToken(token);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Only the admin and team members listed in Studio settings may use the app
    const email = (decoded.email || "").toLowerCase();
    const settings = await storage.getSettings();
    const member = findMemberByEmail(settings.team, email);
    const userIsAdmin = isAdmin(email);

    if (!userIsAdmin && !member) {
      return res.status(403).json({ message: "No access", email });
    }

    // Attach decoded token to req.user for downstream handlers
    (req as any).user = decoded;
    (req as any).actor = {
      uid: decoded.uid,
      email,
      name: member?.name || decoded.name || email,
      isAdmin: userIsAdmin,
      memberName: member?.name,
    } satisfies Actor;

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
    console.error("Auth check failed:", err);
    return res.status(500).json({ message: "Failed to check access" });
  }
};
