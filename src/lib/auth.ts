import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

// Simple shared-secret login: one PIN for counter staff, one password for admin,
// both from environment variables. The session is a signed cookie, no accounts.

export type Role = "staff" | "admin";

export const SESSION_COOKIE = "bt_session";
export const SESSION_HOURS = 12;

const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

export function credentialFor(role: Role): string | undefined {
  const value = role === "admin" ? process.env.ADMIN_PASSWORD : process.env.STAFF_PIN;
  return value ? value.trim() : undefined;
}

export function authConfigured(role: Role): boolean {
  return Boolean(credentialFor(role)) && (process.env.SESSION_SECRET ?? "").length >= 16;
}

function hmac(data: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 16) throw new Error("SESSION_SECRET must be set (at least 16 characters)");
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** Changing the PIN / password changes this, which logs out every existing session. */
function credentialTag(role: Role): string {
  return createHash("sha256").update(credentialFor(role) ?? "").digest("base64url").slice(0, 16);
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function makeSessionValue(role: Role): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  const body = `${role}.${exp}`;
  return `${body}.${hmac(`${body}.${credentialTag(role)}`)}`;
}

export async function getSessionRole(): Promise<Role | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const [role, exp, sig] = value.split(".");
  if ((role !== "staff" && role !== "admin") || !exp || !sig || !/^\d+$/.test(exp)) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  if (!authConfigured(role)) return null;
  return safeEqual(sig, hmac(`${role}.${exp}.${credentialTag(role)}`)) ? role : null;
}

/** For pages: staff pages accept staff or admin; admin pages need admin. */
export async function requireRole(needed: Role): Promise<Role> {
  const role = await getSessionRole();
  if (needed === "admin" ? role !== "admin" : !role) {
    redirect(needed === "admin" ? "/admin/login" : "/staff/login");
  }
  return role!;
}

// ---------- Wrong-attempt limit (per role and IP) ----------

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function attemptKey(role: Role): Promise<string> {
  return `${role}:${await clientIp()}`;
}

export async function isLockedOut(key: string): Promise<boolean> {
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!row) return false;
  if (Date.now() - row.windowStart.getTime() > FAILURE_WINDOW_MS) return false;
  return row.failures >= MAX_FAILURES;
}

export async function recordFailure(key: string): Promise<void> {
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!row || Date.now() - row.windowStart.getTime() > FAILURE_WINDOW_MS) {
    await prisma.loginAttempt.upsert({
      where: { key },
      create: { key, failures: 1, windowStart: new Date() },
      update: { failures: 1, windowStart: new Date() },
    });
  } else {
    await prisma.loginAttempt.update({ where: { key }, data: { failures: { increment: 1 } } });
  }
}

export async function clearFailures(key: string): Promise<void> {
  // Also drop stale rows from other devices so this table never grows.
  await prisma.loginAttempt.deleteMany({
    where: { OR: [{ key }, { windowStart: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }] },
  });
}
