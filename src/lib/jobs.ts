import "server-only";
import type { Job, JobKind, JobStatus } from "@/generated/prisma/client";
import { prisma } from "./db";
import { formatDmy, istDate, istDayStart } from "./dates";
import { formatToken, sevaNames, type EntryView } from "./entry-rules";
import { sheetSetup, writeEntryRow } from "./google-sheet";
import { DEFAULT_LANG, dict, isLang, type Dict, type Lang } from "./i18n";
import { toView } from "./queries";
import { tokenCard } from "./token-card";
import { renderTokenPhoto } from "./token-photo";
import { sendTemplate, TEMPLATE_LANGUAGE_MISSING, uploadImage, whatsAppConfig, WhatsAppError, type WhatsAppConfig } from "./whatsapp";

/*
 * Outside work for an entry: WhatsApp messages and Google Sheet rows. Jobs are saved in the same
 * database write as the entry, run right after the reply is sent (`after()` in the actions), and
 * retried with growing gaps if WhatsApp or Google is down. New entries also pick up a few old
 * failed jobs, and the admin screen has a "retry" button, so nothing needs a scheduler.
 */

const MAX_ATTEMPTS = 6;
/** Minutes to wait after the 1st, 2nd, … failed try. */
const RETRY_AFTER_MINUTES = [1, 5, 15, 60, 180];
/** A job still RUNNING after this long belongs to a request that died; it may be picked up again. */
const STALE_LOCK_MS = 5 * 60_000;
/** A token message that arrives a day late only confuses; skip it instead. */
const WHATSAPP_MAX_AGE_MS = 24 * 60 * 60_000;
/** Token messages to one mobile number per 24 hours, so nobody can flood a number through the form. */
const PER_NUMBER_LIMIT = 3;

export type NewJob = { kind: JobKind; target: string };

/** The outside work a new entry needs, depending on which services are set up. */
export function jobsForNewEntry(mobile: string): NewJob[] {
  const jobs: NewJob[] = [];
  const wa = whatsAppConfig();
  if (wa) {
    jobs.push({ kind: "WHATSAPP_YATRI", target: `91${mobile}` });
    for (const number of wa.teamNumbers) jobs.push({ kind: "WHATSAPP_TEAM", target: number });
  }
  if (sheetSetup().ok) jobs.push({ kind: "SHEET_ADD", target: "" });
  return jobs;
}

/** After a cancellation: mark the entry's sheet row as cancelled (if it was sent to the sheet). */
export async function queueSheetCancel(entryId: string): Promise<void> {
  if (!sheetSetup().ok) return;
  const added = await prisma.job.findUnique({
    where: { entryId_kind_target: { entryId, kind: "SHEET_ADD", target: "" } },
    select: { id: true },
  });
  if (!added) return;
  await prisma.job.createMany({ data: [{ entryId, kind: "SHEET_CANCEL", target: "" }], skipDuplicates: true });
}

/**
 * Runs due jobs: one entry's (right after it is saved or cancelled), or the oldest due ones.
 * Safe to call from many requests at once: each job is claimed before it runs, so a message is
 * never sent twice. Returns how many jobs it ran.
 */
export async function runJobs(opts: { entryId?: string; limit?: number } = {}): Promise<number> {
  const now = Date.now();
  const due = await prisma.job.findMany({
    where: {
      ...(opts.entryId ? { entryId: opts.entryId } : {}),
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, nextTryAt: { lte: new Date(now) }, attempts: { lt: MAX_ATTEMPTS } },
        { status: "RUNNING", lockedAt: { lt: new Date(now - STALE_LOCK_MS) } },
      ],
    },
    orderBy: { id: "asc" },
    take: opts.limit ?? 20,
    select: { id: true },
  });

  const claimed: number[] = [];
  for (const { id } of due) if (await claim(id)) claimed.push(id);
  if (claimed.length === 0) return 0;

  const jobs = await prisma.job.findMany({ where: { id: { in: claimed } }, include: { entry: true }, orderBy: { id: "asc" } });
  const byEntry = new Map<string, typeof jobs>();
  for (const job of jobs) byEntry.set(job.entryId, [...(byEntry.get(job.entryId) ?? []), job]);

  for (const group of byEntry.values()) {
    const entry = toView(group[0].entry);
    const photo = new TokenPhoto(entry);
    for (const job of group) await runOne(job, entry, photo); // in id order: a sheet row is added before it is updated
  }
  return claimed.length;
}

/** Runs due jobs in batches until none are left (or `max` have run). */
export async function drainJobs(max = 200): Promise<void> {
  let done = 0;
  while (done < max) {
    const ran = await runJobs({ limit: 25 });
    if (ran === 0) return;
    done += ran;
  }
}

/** Admin "retry": failed jobs, including ones that used up their tries, start again. */
export async function resetFailedJobs(): Promise<number> {
  const res = await prisma.job.updateMany({
    where: { status: "FAILED" },
    data: { status: "PENDING", attempts: 0, nextTryAt: new Date() },
  });
  return res.count;
}

export type JobHealth = { failed: number; waiting: number };

/** For the admin screen: failed jobs, and due jobs nobody has picked up for 10+ minutes. */
export async function jobHealth(): Promise<JobHealth> {
  const [failed, waiting] = await Promise.all([
    prisma.job.count({ where: { status: "FAILED" } }),
    prisma.job.count({ where: { status: { in: ["PENDING", "RUNNING"] }, nextTryAt: { lt: new Date(Date.now() - 10 * 60_000) } } }),
  ]);
  return { failed, waiting };
}

export type EntryJob = Pick<Job, "kind" | "target" | "status" | "attempts" | "lastError" | "doneAt">;

export async function entryJobs(entryId: string): Promise<EntryJob[]> {
  return prisma.job.findMany({
    where: { entryId },
    orderBy: { id: "asc" },
    select: { kind: true, target: true, status: true, attempts: true, lastError: true, doneAt: true },
  });
}

/** Status of the token message to the yatri's own WhatsApp (null when WhatsApp is not set up). */
export async function yatriMessageStatus(entryId: string, mobile: string): Promise<JobStatus | null> {
  const job = await prisma.job.findUnique({
    where: { entryId_kind_target: { entryId, kind: "WHATSAPP_YATRI", target: `91${mobile}` } },
    select: { status: true },
  });
  return job?.status ?? null;
}

// ---------- running one job ----------

async function claim(id: number): Promise<boolean> {
  const now = Date.now();
  const res = await prisma.job.updateMany({
    where: {
      id,
      OR: [{ status: { in: ["PENDING", "FAILED"] } }, { status: "RUNNING", lockedAt: { lt: new Date(now - STALE_LOCK_MS) } }],
    },
    data: { status: "RUNNING", lockedAt: new Date(now), attempts: { increment: 1 } },
  });
  return res.count === 1;
}

type Outcome = { status: "DONE" | "SKIPPED"; ref?: string; note?: string } | { status: "WAIT"; minutes: number };

async function runOne(job: Job, entry: EntryView, photo: TokenPhoto) {
  try {
    const out = await perform(job, entry, photo);
    if (out.status === "WAIT") {
      // Not this job's fault (it waits for another one): try again soon without using up a try.
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PENDING", attempts: { decrement: 1 }, lockedAt: null, nextTryAt: new Date(Date.now() + out.minutes * 60_000) },
      });
      return;
    }
    await prisma.job.update({
      where: { id: job.id },
      data: { status: out.status, ref: out.ref?.slice(0, 200) || null, lastError: out.note ?? null, doneAt: new Date(), lockedAt: null },
    });
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    const minutes = RETRY_AFTER_MINUTES[Math.min(job.attempts, RETRY_AFTER_MINUTES.length) - 1] ?? 60;
    console.error(`Job ${job.id} (${job.kind}) failed, try ${job.attempts}:`, message);
    await prisma.job
      .update({
        where: { id: job.id },
        data: { status: "FAILED", lastError: message, lockedAt: null, nextTryAt: new Date(Date.now() + minutes * 60_000) },
      })
      .catch((e) => console.error(`Job ${job.id}: could not save the failure`, e));
  }
}

async function perform(job: Job, e: EntryView, photo: TokenPhoto): Promise<Outcome> {
  switch (job.kind) {
    case "WHATSAPP_YATRI":
    case "WHATSAPP_TEAM":
      return sendWhatsApp(job, e, photo);
    case "SHEET_ADD": {
      const setup = sheetSetup();
      if (!setup.ok) return { status: "SKIPPED", note: "Google Sheet is not set up" };
      // The ID photo goes along the first time; once it is in Drive it is removed from the database.
      const photo = e.hasIdPhoto && !e.idPhotoUrl ? await prisma.idPhoto.findUnique({ where: { entryId: e.id } }) : null;
      const out = await writeEntryRow(setup.config, e, photo ?? undefined);
      if (out.photoUrl) {
        await prisma.$transaction([
          prisma.entry.update({ where: { id: e.id }, data: { idPhotoUrl: out.photoUrl } }),
          prisma.idPhoto.deleteMany({ where: { entryId: e.id } }),
        ]);
        e.idPhotoUrl = out.photoUrl; // a cancellation in the same run must keep the link
      }
      return { status: "DONE", ref: out.range };
    }
    case "SHEET_CANCEL": {
      const setup = sheetSetup();
      if (!setup.ok) return { status: "SKIPPED", note: "Google Sheet is not set up" };
      const added = await prisma.job.findUnique({
        where: { entryId_kind_target: { entryId: e.id, kind: "SHEET_ADD", target: "" } },
        select: { status: true },
      });
      if (!added || added.status === "SKIPPED") return { status: "SKIPPED", note: "Entry is not in the sheet" };
      if (added.status !== "DONE") return { status: "WAIT", minutes: 2 }; // its row has to exist first
      return { status: "DONE", ref: (await writeEntryRow(setup.config, e)).range };
    }
  }
}

async function sendWhatsApp(job: Job, e: EntryView, photo: TokenPhoto): Promise<Outcome> {
  const cfg = whatsAppConfig();
  if (!cfg) return { status: "SKIPPED", note: "WhatsApp is not set up" };
  if (e.status === "CANCELLED") return { status: "SKIPPED", note: "Entry was cancelled before sending" };
  if (Date.now() - e.createdAt.getTime() > WHATSAPP_MAX_AGE_MS) return { status: "SKIPPED", note: "Too late to send (over 24 hours)" };
  if (await entriesEarlierToday(e) >= cfg.dailyLimit) return { status: "SKIPPED", note: `Daily limit of ${cfg.dailyLimit} entries reached` };

  const team = job.kind === "WHATSAPP_TEAM";
  if (!team && (await entriesForMobile(e)) > PER_NUMBER_LIMIT) {
    return { status: "SKIPPED", note: `More than ${PER_NUMBER_LIMIT} entries for this number in 24 hours` };
  }

  const imageId = await photo.mediaId(cfg);
  const send = (lang: Lang) =>
    sendTemplate(cfg, {
      to: job.target,
      template: team ? cfg.teamTemplate : cfg.yatriTemplate,
      lang,
      imageId,
      body: team ? teamValues(e) : yatriValues(e, dict[lang]),
    });

  const lang: Lang = team ? "hi" : langOf(e);
  try {
    return { status: "DONE", ref: await send(lang) };
  } catch (err) {
    // The English version of the template may not be approved yet: send the Hindi one instead.
    if (err instanceof WhatsAppError && err.code === TEMPLATE_LANGUAGE_MISSING && lang !== "hi") {
      return { status: "DONE", ref: await send("hi"), note: "Sent in Hindi: the English template is missing" };
    }
    throw err;
  }
}

/** The token photo, drawn and uploaded once per entry however many messages use it. */
class TokenPhoto {
  private upload: Promise<string> | null = null;
  constructor(private readonly entry: EntryView) {}

  mediaId(cfg: WhatsAppConfig): Promise<string> {
    this.upload ??= Promise.resolve().then(() => {
      const png = renderTokenPhoto(tokenCard(this.entry, langOf(this.entry)));
      return uploadImage(cfg, png, `token-${formatToken(this.entry.tokenNo)}.png`);
    });
    return this.upload;
  }
}

function langOf(e: EntryView): Lang {
  return isLang(e.lang) ? e.lang : DEFAULT_LANG;
}

async function entriesEarlierToday(e: EntryView): Promise<number> {
  return prisma.entry.count({ where: { createdAt: { gte: istDayStart(istDate(e.createdAt)), lt: e.createdAt } } });
}

async function entriesForMobile(e: EntryView): Promise<number> {
  return prisma.entry.count({
    where: { mobile: e.mobile, createdAt: { gt: new Date(e.createdAt.getTime() - 24 * 60 * 60_000), lte: e.createdAt } },
  });
}

/** Template "yatri_token": {{1}} name · {{2}} token · {{3}} seva · {{4}} dates · {{5}} people. */
function yatriValues(e: EntryView, t: Dict): string[] {
  return [e.name, `#${formatToken(e.tokenNo)}`, sevaNames(e, t).join(", "), datesText(e, t), peopleText(e, t)];
}

/** Template "yatri_entry_alert" (Hindi): {{1}} token · {{2}} name · {{3}} mobile · {{4}} city · {{5}} seva · {{6}} people · {{7}} dates · {{8}} filled by. */
function teamValues(e: EntryView): string[] {
  const t = dict.hi;
  return [
    `#${formatToken(e.tokenNo)}`,
    e.name,
    `${e.mobile.slice(0, 5)} ${e.mobile.slice(5)}`,
    e.city,
    sevaNames(e, t).join(", "),
    peopleText(e, t),
    datesText(e, t),
    e.enteredBy === "STAFF" ? t.enteredByStaff : t.enteredByYatri,
  ];
}

function peopleText(e: EntryView, t: Dict): string {
  return `${e.totalPeople} (${t.peopleBreakdown(e.men, e.women, e.children)})`;
}

function datesText(e: EntryView, t: Dict): string {
  const parts: string[] = [];
  if (e.mealDate) parts.push(`${e.wantsBhojan ? t.mealOn : t.nashtaOn} ${formatDmy(e.mealDate)}`);
  if (e.checkInDate && e.checkOutDate) parts.push(`${t.stay} ${t.dateRange(formatDmy(e.checkInDate), formatDmy(e.checkOutDate))}`);
  return parts.join(" · ");
}
