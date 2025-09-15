import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallbacksecret";


//payload will be an object containing all reqd info

export function signJwt(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyJwt<T>(token: string): T | null {
    try {
        return jwt.verify(token, JWT_SECRET) as T;
    } catch {
        return null;
    }
}

// Setup cookie
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set("auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60, // 1 hour
    });
}

// Clear auth cookie (async)
export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete({
        name: "auth",
        path: "/",
    });
}

// Get user from cookie (async)
export async function getAuthUser<T>() {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value;
    if (!token) return null;
    return verifyJwt<T>(token);
}
