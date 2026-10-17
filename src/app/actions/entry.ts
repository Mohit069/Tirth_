"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { istDate } from "@/lib/dates";
import { cleanText, isIdPhotoDataUrl, isUuid, parsePayload, validateEntry, type FieldErrors } from "@/lib/entry-rules";
import { jobsForNewEntry, queueSheetCancel, runJobs } from "@/lib/jobs";
import { getLang } from "@/lib/lang";
import { cancelEntryById, insertEntry } from "@/lib/queries";

export type CreateEntryResult =
  | { ok: true; id: string }
  | { ok: false; errors: FieldErrors }
  | { ok: false; error: "invalid" | "server" };

/**
 * Public: the yatri form (or staff filling it for a yatri) saves an entry. `idPhoto` is the
 * optional ID photo for a stay, already shrunk on the phone to a JPEG data URL.
 */
export async function createEntry(input: unknown, idPhoto?: unknown): Promise<CreateEntryResult> {
  const payload = parsePayload(input);
  if (!payload) return { ok: false, error: "invalid" };

  const role = await getSessionRole();
  const checked = validateEntry(payload, { today: istDate(), isStaff: role !== null });
  if (!checked.ok) return { ok: false, errors: checked.errors };

  let photo: Uint8Array<ArrayBuffer> | null = null;
  if (idPhoto !== undefined && idPhoto !== null && payload.stay) {
    photo = isIdPhotoDataUrl(idPhoto) ? new Uint8Array(Buffer.from(idPhoto.slice(idPhoto.indexOf(",") + 1), "base64")) : null;
    // Only a real JPEG (starts FF D8 FF) is kept.
    if (!photo || photo[0] !== 0xff || photo[1] !== 0xd8 || photo[2] !== 0xff) return { ok: false, errors: { idPhoto: "errIdPhoto" } };
  }

  try {
    const lang = await getLang();
    const id = await insertEntry(payload.id, checked.entry, role ? "STAFF" : "YATRI", lang, jobsForNewEntry(checked.entry.mobile), photo);
    // WhatsApp messages and the Google Sheet row go out after the reply, so nobody waits for them.
    after(() => runJobsSafely(id));
    return { ok: true, id };
  } catch (err) {
    console.error("createEntry failed", err);
    return { ok: false, error: "server" };
  }
}

export type CancelResult = { ok: true } | { ok: false; error: "reason" | "auth" | "server" };

/** Staff / admin: cancel an entry with a reason. Nothing is ever deleted. */
export async function cancelEntry(id: string, reason: string): Promise<CancelResult> {
  const role = await getSessionRole();
  if (!role) return { ok: false, error: "auth" };
  if (!isUuid(id)) return { ok: false, error: "server" };

  const cleanReason = cleanText(typeof reason === "string" ? reason : "").slice(0, 200);
  if (cleanReason.length < 2) return { ok: false, error: "reason" };

  try {
    if (await cancelEntryById(id, cleanReason)) {
      await queueSheetCancel(id);
      after(() => runJobsSafely(id));
    }
  } catch (err) {
    console.error("cancelEntry failed", err);
    return { ok: false, error: "server" };
  }
  revalidatePath("/staff");
  return { ok: true };
}

/**
 * This entry's jobs, then a few older ones that are due for a retry. A database hiccup gets two
 * more tries a moment later (jobs are claimed before they run, so a retry never sends twice).
 */
async function runJobsSafely(entryId: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await runJobs({ entryId });
      await runJobs({ limit: 5 });
      return;
    } catch (err) {
      if (attempt === 3) {
        console.error("Running WhatsApp / Google Sheet jobs failed", err);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}
