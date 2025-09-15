import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { setAuthCookie } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallbacksecret";

interface InvitationToken {
    type: "invitation";
    email: string;
    role: "MEMBER" | "ADMIN";
    tenantId: string;
    tenantName: string;
    invitedBy: string;
    invitedAt: string;
    exp: number;
    iat?: number;
}

function verifyInvitation(token: string): InvitationToken | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as InvitationToken;
        if (decoded.type !== "invitation") return null;
        return decoded;
    } catch {
        return null;
    }
}

// GET /api/auth/accept-invite?token=...
// Validates token and returns data (without sensitive signing details)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const invitation = verifyInvitation(token);
    if (!invitation) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    return NextResponse.json({
        email: invitation.email,
        role: invitation.role,
        tenantName: invitation.tenantName,
        tenantId: invitation.tenantId,
        invitedBy: invitation.invitedBy,
    });
}

// POST /api/auth/accept-invite
// Body: { token: string; password: string }
// Creates user and logs them in
export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();
        if (!token || !password) {
            return NextResponse.json({ error: "Token and password required" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        const invitation = verifyInvitation(token);
        if (!invitation) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        // Ensure tenant still exists
        const tenant = await prisma.tenant.findUnique({ where: { id: invitation.tenantId } });
        if (!tenant) {
            return NextResponse.json({ error: "Tenant no longer exists" }, { status: 410 });
        }

        // Prevent duplicate creation
        const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
        if (existing) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: invitation.email,
                password: hashed,
                role: invitation.role,
                tenantId: invitation.tenantId,
            },
        });

        // Issue auth token (1h) using existing login flow util (re-using signJwt would be nice but we want standard shape)
        const loginJwt = (await import("jsonwebtoken")).sign(
            { userId: user.id, tenantId: user.tenantId, role: user.role },
            JWT_SECRET,
            { expiresIn: "1h" }
        );
        await setAuthCookie(loginJwt);

        return NextResponse.json({ message: "Invitation accepted", user: { id: user.id, email: user.email } });
    } catch (err) {
        console.error("Accept invite error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
