import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST /api/tenants/[slug]/upgrade → upgrade tenant subscription (Admin only)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const user = await getAuthUser<{ userId: string; tenantId: string; role: string }>();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check if user is an admin
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        // Await params before using
        const { slug } = await params;

        // Find the tenant by slug
        const tenant = await prisma.tenant.findUnique({
            where: { slug },
        }); if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Ensure admin belongs to this tenant
        if (tenant.id !== user.tenantId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Upgrade tenant to PRO plan
        const updatedTenant = await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan: "PRO" },
        });

        return NextResponse.json({
            message: "Tenant upgraded to Pro successfully",
            tenant: updatedTenant,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}