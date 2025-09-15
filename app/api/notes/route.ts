import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/notes → list all notes for tenant
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const notes = await prisma.note.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(notes);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/notes → create a new note
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { title, content } = await req.json();

        // Check subscription plan limit
        const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
        if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

        if (tenant.plan === "FREE") {
            const noteCount = await prisma.note.count({ where: { tenantId: tenant.id } });
            if (noteCount >= 3) {
                return NextResponse.json({ error: "Free plan limit reached" }, { status: 403 });
            }
        }

        const note = await prisma.note.create({
            data: {
                title,
                content,
                userId: user.userId,
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
