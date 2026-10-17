import "server-only";
import { Prisma, type Entry, type JobKind } from "@/generated/prisma/client";
import { prisma } from "./db";
import { addDays, fromDbDate, istDayStart, toDbDate } from "./dates";
import { normalizeMobile, type CleanEntry, type EntryView } from "./entry-rules";
import type { Lang } from "./i18n";

// Every query here is bounded by an index (createdAt, tokenNo, mobile, the trigram
// search indexes, checkOutDate) and returns a limited number of rows, so screens stay
// fast as the Entry table grows into millions of rows.

export function toView(e: Entry): EntryView {
  return {
    ...e,
    mealDate: e.mealDate ? fromDbDate(e.mealDate) : null,
    checkInDate: e.checkInDate ? fromDbDate(e.checkInDate) : null,
    checkOutDate: e.checkOutDate ? fromDbDate(e.checkOutDate) : null,
  };
}

/** Entries created on India calendar days from..to (inclusive). */
function createdBetween(from: string, to: string): Prisma.EntryWhereInput {
  return { createdAt: { gte: istDayStart(from), lt: istDayStart(addDays(to, 1)) } };
}

/** Search by token number, mobile number (full or part) or part of a name. */
function searchWhere(q: string): Prisma.EntryWhereInput {
  const s = q.replace(/^#/, "").trim();
  if (/^[\d\s+-]+$/.test(s)) {
    const digits = s.replace(/\D/g, "");
    const mobile = digits.length > 10 ? normalizeMobile(digits) : digits;
    const or: Prisma.EntryWhereInput[] = [];
    if (digits.length <= 7) or.push({ tokenNo: Number(digits) });
    if (mobile.length === 10) or.push({ mobile });
    else if (mobile.length >= 3) or.push({ mobile: { contains: mobile } });
    return or.length ? { OR: or } : { tokenNo: -1 }; // nothing to search for: match nothing
  }
  return { name: { contains: s, mode: "insensitive" } };
}

/** Exact token match first, then newest first. */
function tokenFirst(entries: EntryView[], q: string): EntryView[] {
  const s = q.replace(/^#/, "").trim();
  if (!/^\d{1,7}$/.test(s)) return entries;
  const n = Number(s);
  return [...entries.filter((e) => e.tokenNo === n), ...entries.filter((e) => e.tokenNo !== n)];
}

const num = (v: unknown) => Number(v ?? 0);

// ---------- Yatri ----------

/** Saves the entry and its WhatsApp / Google Sheet jobs in one write, so no job is ever lost. */
export async function insertEntry(
  id: string,
  entry: CleanEntry,
  enteredBy: "YATRI" | "STAFF",
  lang: Lang,
  jobs: { kind: JobKind; target: string }[],
  idPhoto: Uint8Array<ArrayBuffer> | null = null,
): Promise<string> {
  try {
    await prisma.entry.create({
      data: {
        id,
        ...entry,
        mealDate: entry.mealDate ? toDbDate(entry.mealDate) : null,
        checkInDate: entry.checkInDate ? toDbDate(entry.checkInDate) : null,
        checkOutDate: entry.checkOutDate ? toDbDate(entry.checkOutDate) : null,
        enteredBy,
        lang,
        jobs: { create: jobs },
        ...(idPhoto ? { hasIdPhoto: true, idPhoto: { create: { mime: "image/jpeg", data: idPhoto } } } : {}),
      },
    });
    return id;
  } catch (err) {
    // Same form sent twice: the first one already saved it, so return that token.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.entry.findUnique({ where: { id }, select: { id: true } });
      if (existing) return existing.id;
    }
    throw err;
  }
}

export async function getEntry(id: string): Promise<EntryView | null> {
  const e = await prisma.entry.findUnique({ where: { id } });
  return e ? toView(e) : null;
}

// ---------- Staff ----------

export const STAFF_TABS = ["all", "nashta", "bhojan", "stay", "cancelled"] as const;
export type StaffTab = (typeof STAFF_TABS)[number];

/** Most cards the staff list renders at once (a festival day can have thousands). */
export const STAFF_LIST_LIMIT = 200;
export const SEARCH_LIMIT = 100;

function tabWhere(tab: StaffTab): Prisma.EntryWhereInput {
  switch (tab) {
    case "nashta":
      return { status: "ACTIVE", wantsNashta: true };
    case "bhojan":
      return { status: "ACTIVE", wantsBhojan: true };
    case "stay":
      return { status: "ACTIVE", wantsStay: true };
    case "cancelled":
      return { status: "CANCELLED" };
    default:
      return {};
  }
}

export type StaffData = {
  entries: EntryView[];
  /** How many entries each tab has (today, or matching the search). */
  counts: Record<StaffTab, number>;
  activeEntries: number;
  activePeople: number;
  /** True when there are more entries than the list shows. */
  truncated: boolean;
};

export function matchesTab(e: EntryView, tab: StaffTab): boolean {
  switch (tab) {
    case "nashta":
      return e.status === "ACTIVE" && e.wantsNashta;
    case "bhojan":
      return e.status === "ACTIVE" && e.wantsBhojan;
    case "stay":
      return e.status === "ACTIVE" && e.wantsStay;
    case "cancelled":
      return e.status === "CANCELLED";
    default:
      return true;
  }
}

/** Today's entries, or (when searching) the newest matches from any date. */
export async function staffData(q: string, tab: StaffTab, today: string): Promise<StaffData> {
  if (q) return staffSearch(q, tab);

  const base = createdBetween(today, today);
  const [rows, active, ...tabCounts] = await Promise.all([
    prisma.entry.findMany({ where: { AND: [base, tabWhere(tab)] }, orderBy: { createdAt: "desc" }, take: STAFF_LIST_LIMIT }),
    prisma.entry.aggregate({ where: { AND: [base, { status: "ACTIVE" }] }, _count: { _all: true }, _sum: { totalPeople: true } }),
    ...STAFF_TABS.map((k) => prisma.entry.count({ where: { AND: [base, tabWhere(k)] } })),
  ]);

  const counts = Object.fromEntries(STAFF_TABS.map((k, i) => [k, tabCounts[i]])) as Record<StaffTab, number>;
  return {
    entries: rows.map(toView),
    counts,
    activeEntries: active._count._all,
    activePeople: active._sum.totalPeople ?? 0,
    truncated: counts[tab] > rows.length,
  };
}

/**
 * Search over all dates. Only the newest matches are read (a common surname can match
 * a large share of years of entries), and tab counts are taken from those rows.
 */
async function staffSearch(q: string, tab: StaffTab): Promise<StaffData> {
  const s = q.replace(/^#/, "").trim();
  const tokenNo = /^\d{1,7}$/.test(s) ? Number(s) : null;
  const [rows, exact] = await Promise.all([
    prisma.entry.findMany({ where: searchWhere(q), orderBy: { createdAt: "desc" }, take: SEARCH_LIMIT + 1 }),
    tokenNo !== null ? prisma.entry.findUnique({ where: { tokenNo } }) : Promise.resolve(null),
  ]);

  const more = rows.length > SEARCH_LIMIT;
  let found = rows.slice(0, SEARCH_LIMIT).map(toView);
  if (exact && !found.some((e) => e.id === exact.id)) found = [toView(exact), ...found];
  found = tokenFirst(found, q);

  const counts = Object.fromEntries(STAFF_TABS.map((k) => [k, found.filter((e) => matchesTab(e, k)).length])) as Record<StaffTab, number>;
  const active = found.filter((e) => e.status === "ACTIVE");
  return {
    entries: found.filter((e) => matchesTab(e, tab)),
    counts,
    activeEntries: active.length,
    activePeople: active.reduce((sum, e) => sum + e.totalPeople, 0),
    truncated: more,
  };
}

/** Cancels an active entry. Entries are never deleted. */
export async function cancelEntryById(id: string, reason: string): Promise<boolean> {
  const res = await prisma.entry.updateMany({
    where: { id, status: "ACTIVE" },
    data: { status: "CANCELLED", cancelReason: reason, cancelledAt: new Date() },
  });
  return res.count === 1;
}

// ---------- Admin ----------

export type SevaFilter = "" | "nashta" | "bhojan" | "stay";
export type StatusFilter = "" | "active" | "cancelled";

type Counted = { entries: number; people: number };

export type DashboardData = {
  entries: number;
  yatri: number;
  nashta: Counted;
  bhojan: Counted;
  stay: Counted;
  cancelled: number;
  stayingNow: Counted;
  perDay: { date: string; yatri: number }[];
};

type TotalsRow = Record<
  | "entries"
  | "yatri"
  | "nashta_entries"
  | "nashta_people"
  | "bhojan_entries"
  | "bhojan_people"
  | "stay_entries"
  | "stay_people"
  | "cancelled",
  bigint | number | string | null
>;

/**
 * Counting rules: cancelled entries are left out of every number except the
 * "Cancelled" count. Entries count on the day the form was filled. Nashta and
 * Bhojan people use "how many people" from the meal section. All of it is summed
 * inside the database, so a year of data is one indexed pass, not rows in memory.
 */
export async function dashboard(from: string, to: string, today: string): Promise<DashboardData> {
  const start = istDayStart(from);
  const end = istDayStart(addDays(to, 1));
  const todayDb = toDbDate(today);

  const [totalsRows, dayRows, staying] = await Promise.all([
    prisma.$queryRaw<TotalsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ACTIVE')                                              AS entries,
        SUM("totalPeople") FILTER (WHERE status = 'ACTIVE')                                    AS yatri,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "wantsNashta")                            AS nashta_entries,
        SUM(COALESCE("mealPeople", "totalPeople")) FILTER (WHERE status = 'ACTIVE' AND "wantsNashta") AS nashta_people,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "wantsBhojan")                            AS bhojan_entries,
        SUM(COALESCE("mealPeople", "totalPeople")) FILTER (WHERE status = 'ACTIVE' AND "wantsBhojan") AS bhojan_people,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "wantsStay")                              AS stay_entries,
        SUM("totalPeople") FILTER (WHERE status = 'ACTIVE' AND "wantsStay")                    AS stay_people,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')                                           AS cancelled
      FROM "Entry"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end}`,
    prisma.$queryRaw<{ day: string; yatri: bigint | number | string }[]>`
      SELECT to_char("createdAt" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day, SUM("totalPeople") AS yatri
      FROM "Entry"
      WHERE "createdAt" >= ${start} AND "createdAt" < ${end} AND status = 'ACTIVE'
      GROUP BY 1`,
    // Staying today: check-in on or before today and check-out on or after today.
    prisma.entry.aggregate({
      where: { status: "ACTIVE", wantsStay: true, checkOutDate: { gte: todayDb }, checkInDate: { lte: todayDb } },
      _count: { _all: true },
      _sum: { totalPeople: true },
    }),
  ]);

  const r = totalsRows[0];
  const byDay = new Map(dayRows.map((d) => [d.day, num(d.yatri)]));
  const perDay: DashboardData["perDay"] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) perDay.push({ date: d, yatri: byDay.get(d) ?? 0 });

  return {
    entries: num(r?.entries),
    yatri: num(r?.yatri),
    nashta: { entries: num(r?.nashta_entries), people: num(r?.nashta_people) },
    bhojan: { entries: num(r?.bhojan_entries), people: num(r?.bhojan_people) },
    stay: { entries: num(r?.stay_entries), people: num(r?.stay_people) },
    cancelled: num(r?.cancelled),
    stayingNow: { entries: staying._count._all, people: staying._sum.totalPeople ?? 0 },
    perDay,
  };
}

export const ADMIN_PAGE_SIZE = 50;

export async function adminEntries(f: {
  from: string;
  to: string;
  q: string;
  seva: SevaFilter;
  status: StatusFilter;
  page: number;
}): Promise<{ entries: EntryView[]; total: number; page: number; pages: number }> {
  const and: Prisma.EntryWhereInput[] = [createdBetween(f.from, f.to)];
  if (f.q) and.push(searchWhere(f.q));
  if (f.seva === "nashta") and.push({ wantsNashta: true });
  if (f.seva === "bhojan") and.push({ wantsBhojan: true });
  if (f.seva === "stay") and.push({ wantsStay: true });
  if (f.status === "active") and.push({ status: "ACTIVE" });
  if (f.status === "cancelled") and.push({ status: "CANCELLED" });
  const where: Prisma.EntryWhereInput = { AND: and };

  const total = await prisma.entry.count({ where });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pages);
  const rows = await prisma.entry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
  });
  return { entries: rows.map(toView), total, page, pages };
}

/**
 * Walks the entries of a date range in token order, `batchSize` rows at a time,
 * so a year-long CSV export never holds the whole range in memory.
 */
export async function* exportBatches(from: string, to: string, batchSize = 1000): AsyncGenerator<EntryView[]> {
  const range = createdBetween(from, to);
  const bounds = await prisma.entry.aggregate({ where: range, _min: { tokenNo: true }, _max: { tokenNo: true } });
  const max = bounds._max.tokenNo;
  let after = (bounds._min.tokenNo ?? 1) - 1;
  if (max === null) return;

  while (after < max) {
    const rows = await prisma.entry.findMany({
      where: { AND: [range, { tokenNo: { gt: after, lte: max } }] },
      orderBy: { tokenNo: "asc" },
      take: batchSize,
    });
    if (rows.length === 0) return;
    yield rows.map(toView);
    after = rows[rows.length - 1].tokenNo;
  }
}
