"use server";

import { after } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { drainJobs, resetFailedJobs } from "@/lib/jobs";

/**
 * Admin: send failed WhatsApp messages and Google Sheet rows again. The sending happens after
 * the reply; the button refreshes the page a few seconds later to show the result.
 */
export async function retryJobs(): Promise<{ ok: boolean; count: number }> {
  if ((await getSessionRole()) !== "admin") return { ok: false, count: 0 };
  const count = await resetFailedJobs();
  after(async () => {
    try {
      await drainJobs();
    } catch (err) {
      console.error("Retrying jobs failed", err);
    }
  });
  return { ok: true, count };
}
