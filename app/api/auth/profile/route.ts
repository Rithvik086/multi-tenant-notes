import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/auth/profile → get current user profile
export async function GET() {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Fetch user with tenant information
        const userProfile = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                id: true,
                email: true,
                role: true,
                tenant: {
                    select: {
                        name: true,
                        slug: true,
                        plan: true,
                    }
                }
            }
        });

        if (!userProfile) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(userProfile);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}