import "server-only";
import { istDate } from "./dates";
import { entryRow, ID_PHOTO_COLUMN } from "./entry-columns";
import { formatToken, type EntryView } from "./entry-rules";
import { DEFAULT_LANG, dict } from "./i18n";

/*
 * Keeps a copy of every entry in the trust's Google Sheet, through a small Google Apps Script
 * installed in that sheet (google-apps-script/Code.gs). The script writes one row per entry in a
 * tab per month and saves the optional ID photo in the sheet owner's Google Drive. It is free and
 * needs no Google Cloud project; a shared secret stops anyone else from writing to it.
 */

export type SheetConfig = { scriptUrl: string; secret: string };

export type SheetSetup = { ok: true; config: SheetConfig } | { ok: false; reason: "missing" | "invalid" };

/** GOOGLE_SCRIPT_URL (the script's web app address) and GOOGLE_SCRIPT_SECRET. */
export function sheetSetup(): SheetSetup {
  const scriptUrl = (process.env.GOOGLE_SCRIPT_URL ?? "").trim();
  const secret = (process.env.GOOGLE_SCRIPT_SECRET ?? "").trim();
  if (!scriptUrl) return { ok: false, reason: "missing" };
  try {
    const { protocol } = new URL(scriptUrl);
    if ((protocol === "https:" || protocol === "http:") && secret.length >= 16) return { ok: true, config: { scriptUrl, secret } };
  } catch {
    // fall through
  }
  return { ok: false, reason: "invalid" };
}

/** Link to the sheet for the admin screen (GOOGLE_SHEET_ID is optional, only used for this). */
export function sheetLink(): string | null {
  const id = (process.env.GOOGLE_SHEET_ID ?? "").trim();
  return id ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/edit` : null;
}

/** Monthly tab for an entry, e.g. "2026-10" (India time). Keeps each tab small and fast to open. */
export function tabFor(createdAt: Date): string {
  return istDate(createdAt).slice(0, 7);
}

export type SheetWrite = { range: string; photoUrl: string | null };

/**
 * Writes the entry's row with its current values: a new row the first time, the same row after
 * a cancellation or a retry. With `photo`, the script also saves it in Drive and links it.
 */
export async function writeEntryRow(cfg: SheetConfig, e: EntryView, photo?: { mime: string; data: Uint8Array }): Promise<SheetWrite> {
  const res = await fetch(cfg.scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: cfg.secret,
      tab: tabFor(e.createdAt),
      headers: dict[DEFAULT_LANG].csvHeaders,
      token: String(e.tokenNo),
      row: entryRow(e, dict[DEFAULT_LANG]).map((v) => v ?? ""),
      photoColumn: ID_PHOTO_COLUMN,
      photo: photo
        ? { name: `token-${formatToken(e.tokenNo)}-id.jpg`, mime: photo.mime, data: Buffer.from(photo.data).toString("base64") }
        : null,
    }),
    redirect: "follow", // Apps Script answers through a redirect to googleusercontent.com
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let body: { ok?: boolean; error?: string; range?: string; photoUrl?: string };
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Google Sheet script answered ${res.status} with a page instead of data: ${text.replace(/\s+/g, " ").slice(0, 150)}`);
  }
  if (!body.ok) throw new Error(`Google Sheet script: ${body.error ?? "unknown error"}`);
  return { range: body.range ?? "", photoUrl: body.photoUrl || null };
}
