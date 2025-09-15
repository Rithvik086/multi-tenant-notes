import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/auth/invite
// Body: { email: string; role: "MEMBER" | "ADMIN" }
// Returns: { invitationLink: string }
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, role } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const inviteRole = role === "ADMIN" ? "ADMIN" : "MEMBER"; // default to MEMBER if not ADMIN

    // Check if user already exists globally (any tenant)
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    // Fetch tenant (for name/slug)
    const tenant = await prisma.tenant.findUnique({ where: { id: authUser.tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Fetch inviter (for email) - though we don't strictly need DB fetch if we store email in JWT at login; currently we don't
    const inviter = await prisma.user.findUnique({ where: { id: authUser.userId } });
    if (!inviter) {
      return NextResponse.json({ error: "Inviting user not found" }, { status: 404 });
    }

    const now = Math.floor(Date.now() / 1000);
    const sevenDays = 7 * 24 * 60 * 60; // seconds

    const invitationPayload = {
      type: "invitation" as const,
      email: normalizedEmail,
      role: inviteRole,
      tenantId: tenant.id,
      tenantName: tenant.name,
      invitedBy: inviter.email,
      invitedAt: new Date().toISOString(),
      exp: now + sevenDays,
    };

    // We want a 7 day expiry irrespective of default signJwt 1h; so call jwt directly? For now, reuse signJwt is limited to 1h. We'll sign manually here.
    // Instead of altering global signJwt, we import jsonwebtoken directly for custom exp.

    // Sign manually WITHOUT passing expiresIn because we already include exp in payload
    const jwt = (await import("jsonwebtoken")).default;
    const JWT_SECRET = process.env.JWT_SECRET || "fallbacksecret";
    const token = jwt.sign(invitationPayload, JWT_SECRET);

    // Construct link (assuming accept-invite page at /auth/accept-invite?token=...)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const origin = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
    const invitationLink = `${origin}/auth/accept-invite?token=${encodeURIComponent(token)}`;

    console.log("[INVITATION] Link generated:", invitationLink);

    return NextResponse.json({ invitationLink });
  } catch (err) {
    console.error("Invitation error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
