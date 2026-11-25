import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "hsu_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type Session = {
  username: string;
  isHsuStaff: boolean;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 bytes.");
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string, isHsuStaff: boolean) {
  const payload = Buffer.from(
    JSON.stringify({
      username,
      isHsuStaff,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expectedSignature = Buffer.from(sign(payload));
  const actualSignature = Buffer.from(signature);
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;

    const session = parsed as {
      username?: unknown;
      isHsuStaff?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof session.username !== "string" ||
      session.username.length === 0 ||
      typeof session.isHsuStaff !== "boolean" ||
      typeof session.expiresAt !== "number" ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    return { username: session.username, isHsuStaff: session.isHsuStaff };
  } catch {
    return null;
  }
}
