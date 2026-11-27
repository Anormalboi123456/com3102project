import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type Session } from "@/lib/session";

export function resolvePhpEndpoint(envKey: string, defaultFilename: string): string | null {
  const explicit = process.env[envKey]?.trim();
  if (explicit) return explicit;

  // Automatically derive from PHP_USER_ACCOUNTS_API_URL or PHP_LOGIN_API_URL if not explicitly set
  const baseSource =
    process.env.PHP_USER_ACCOUNTS_API_URL?.trim() ||
    process.env.PHP_LOGIN_API_URL?.trim() ||
    process.env.PHP_REGISTER_API_URL?.trim();

  if (!baseSource) return null;

  try {
    const url = new URL(baseSource);
    const lastSlash = url.pathname.lastIndexOf("/");
    const baseDir = lastSlash >= 0 ? url.pathname.slice(0, lastSlash + 1) : "/";
    url.pathname = `${baseDir}${defaultFilename}`;
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function getApiToken(): string | null {
  const token = process.env.STUDENTS_API_TOKEN?.trim();
  return token && token.length > 0 ? token : null;
}

export async function getCurrentSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  try {
    return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  } catch (error) {
    console.error("Could not verify the session cookie:", error);
    return null;
  }
}
