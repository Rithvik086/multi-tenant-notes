import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const origin = req.headers.get("origin") || "*";
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

    const res = NextResponse.next();
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.headers.set("Access-Control-Allow-Credentials", "true");
    }

    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: res.headers,
      });
    }

    return res;
  }

  // For page routes, let Next.js handle routing naturally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
