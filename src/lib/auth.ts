import { cookies } from "next/headers";

const AUTH_COOKIE = "physio-crm-auth";

export async function createAuthToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET || "default-secret";
  const data = `authenticated:${secret}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(signature).toString("hex");
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  const expected = await createAuthToken();
  return token === expected;
}

export async function setAuthCookie() {
  const token = await createAuthToken();
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value;
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthCookie();
  if (!token) return false;
  return verifyAuthToken(token);
}
