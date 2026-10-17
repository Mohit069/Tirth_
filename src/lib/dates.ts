// Date helpers. Everything in this app is in India time (Asia/Kolkata, UTC+5:30,
// no daylight saving), whatever timezone the server or the phone is set to.
// Calendar days are passed around as "YYYY-MM-DD" strings.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar day (YYYY-MM-DD) in India for a moment in time. */
export function istDate(moment: Date = new Date()): string {
  return new Date(moment.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isYmd(value: unknown): value is string {
  if (typeof value !== "string" || !YMD_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** The instant an India calendar day starts, for createdAt range queries. */
export function istDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+05:30`);
}

/** Value for a Postgres DATE column. */
export function toDbDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

/** Read a Postgres DATE column back as YYYY-MM-DD. */
export function fromDbDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 2026-10-12 -> 12-10-2026 */
export function formatDmy(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}-${m}-${y}`;
}

/** 2026-10-12 -> 12-10 */
export function formatDm(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${d}-${m}`;
}

const MONTHS = {
  hi: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
} as const;

/** 2026-10-12 -> "12 अक्टूबर" / "12 Oct" */
export function formatDayMonth(ymd: string, lang: "hi" | "en"): string {
  const [, m, d] = ymd.split("-");
  return `${Number(d)} ${MONTHS[lang][Number(m) - 1]}`;
}

/** 2026-10-12 -> "अक्टूबर 2026" / "Oct 2026" */
export function formatMonthYear(ymd: string, lang: "hi" | "en"): string {
  const [y, m] = ymd.split("-");
  return `${MONTHS[lang][Number(m) - 1]} ${y}`;
}

/** First day of the month: 2026-10-12 -> 2026-10-01 */
export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

/** First day of the month `by` months away from the month of ymd. */
export function addMonths(ymd: string, by: number): string {
  const d = new Date(`${monthStart(ymd)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 10);
}

/** Time of day in India, e.g. "10:42 am". */
export function formatIstTime(moment: Date): string {
  const ist = new Date(moment.getTime() + IST_OFFSET_MS);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** e.g. "12-10-2026, 10:42 am" */
export function formatIstDateTime(moment: Date): string {
  return `${formatDmy(istDate(moment))}, ${formatIstTime(moment)}`;
}
