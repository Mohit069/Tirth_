import { addDays, daysBetween, isYmd } from "./dates";

export type RangePreset = "today" | "yesterday" | "month" | "custom";
export type DateRange = { preset: RangePreset; from: string; to: string };

const MAX_RANGE_DAYS = 366;

/** Admin date range from the URL (?range=today|yesterday|month|custom&from=&to=). */
export function resolveRange(params: { range?: string; from?: string; to?: string }, today: string): DateRange {
  switch (params.range) {
    case "yesterday": {
      const d = addDays(today, -1);
      return { preset: "yesterday", from: d, to: d };
    }
    case "month":
      return { preset: "month", from: `${today.slice(0, 7)}-01`, to: today };
    case "custom": {
      let from = isYmd(params.from) ? params.from : today;
      let to = isYmd(params.to) ? params.to : from;
      if (from > to) [from, to] = [to, from];
      if (daysBetween(from, to) >= MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
      return { preset: "custom", from, to };
    }
    default:
      return { preset: "today", from: today, to: today };
  }
}

/** URL params that reproduce a range. */
export function rangeParams(r: DateRange): Record<string, string> {
  if (r.preset === "custom") return { range: "custom", from: r.from, to: r.to };
  if (r.preset === "today") return {};
  return { range: r.preset };
}
