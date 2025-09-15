import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET /api/notes/[id] → retrieve a specific note
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Await params before using
        const { id } = await params;

        const note = await prisma.note.findFirst({
            where: {
                id,
                tenantId: user.tenantId, // Ensure tenant isolation
            },
        });

        if (!note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        return NextResponse.json(note);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT /api/notes/[id] → update a note
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { title, content } = await req.json();

        // Await params before using
        const { id } = await params;

        // Check if note exists and belongs to tenant
        const existingNote = await prisma.note.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
        });

        if (!existingNote) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        const updatedNote = await prisma.note.update({
            where: { id },
            data: {
                title,
                content,
            },
        });

        return NextResponse.json(updatedNote);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/notes/[id] → delete a note
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Await params before using
        const { id } = await params;

        // Check if note exists and belongs to tenant
        const existingNote = await prisma.note.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
        });

        if (!existingNote) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        await prisma.note.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Note deleted successfully" });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}