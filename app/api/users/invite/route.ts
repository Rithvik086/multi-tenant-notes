import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

// POST /api/users/invite → invite a new user (Admin only)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check if user is an admin
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { email, password, role = "MEMBER" } = await req.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user in the same tenant
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: role === "ADMIN" ? "ADMIN" : "MEMBER",
                tenantId: user.tenantId,
            },
        });

        // Remove password from response
        const { password: _, ...userResponse } = newUser;

        return NextResponse.json({
            message: "User invited successfully",
            user: userResponse,
        }, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}