import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";

  const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(",") || ["*"];

  // If origin allowed, add CORS headers
  const res = NextResponse.next();
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Handle OPTIONS preflight globally
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: res.headers,
    });
  }
console.log("Middleware executed for:", req.url);
  return res;
}

// Apply only to API routes
export const config = {
  matcher: "/api/:path*",
  
};
