"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_HOURS,
  attemptKey,
  authConfigured,
  clearFailures,
  credentialFor,
  isLockedOut,
  makeSessionValue,
  recordFailure,
  safeEqual,
  type Role,
} from "@/lib/auth";

export type LoginState = { error: "wrong" | "tooMany" | "notConfigured" | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const role: Role = formData.get("role") === "admin" ? "admin" : "staff";
  const secret = String(formData.get("secret") ?? "").trim();

  if (!authConfigured(role)) return { error: "notConfigured" };

  const key = await attemptKey(role);
  if (await isLockedOut(key)) return { error: "tooMany" };

  if (!secret || !safeEqual(secret, credentialFor(role)!)) {
    await recordFailure(key);
    return { error: "wrong" };
  }

  await clearFailures(key);
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  (await cookies()).set(SESSION_COOKIE, makeSessionValue(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect(role === "admin" ? "/admin" : "/staff");
}

export async function logout(formData: FormData) {
  (await cookies()).delete(SESSION_COOKIE);
  redirect(formData.get("to") === "admin" ? "/admin/login" : "/staff/login");
}
