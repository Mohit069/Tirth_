"use client";

import { useState } from "react";
import { addDays, addMonths, formatDayMonth, formatMonthYear, monthStart } from "@/lib/dates";
import type { Dict, Lang } from "@/lib/i18n";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

/**
 * A big "today" button and, below it, a month calendar for any other day from `min` to `max`.
 * Days after the chosen one up to `rangeEnd` (the check-out day) are shaded, so the stay shows.
 */
export function DateCalendar({
  value,
  onChange,
  today,
  min,
  max,
  rangeEnd,
  invalid,
  lang,
  t,
}: {
  value: string;
  onChange: (v: string) => void;
  today: string;
  min: string;
  max: string;
  rangeEnd?: string;
  invalid?: boolean;
  lang: Lang;
  t: Dict;
}) {
  const [month, setMonth] = useState(() => monthStart(value)); // first day of the month on show
  const lead = new Date(`${month}T00:00:00Z`).getUTCDay(); // empty cells before the 1st (0 = Sunday)
  const length = Number(addDays(addMonths(month, 1), -1).slice(8));
  const days = Array.from({ length }, (_, i) => addDays(month, i));

  function pick(day: string) {
    onChange(day);
    setMonth(monthStart(day));
  }

  const todayOn = value === today;
  const navBtn =
    "grid size-10 shrink-0 place-items-center rounded-full text-ink transition hover:bg-brand-soft active:bg-brand-tint disabled:pointer-events-none disabled:opacity-25";

  return (
    <div>
      <button
        type="button"
        aria-pressed={todayOn}
        onClick={() => pick(today)}
        className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 px-4 transition focus-visible:ring-4 focus-visible:ring-brand-tint active:scale-[0.99] ${
          todayOn ? "border-brand bg-brand-soft text-brand-strong" : invalid ? "border-danger/60 bg-card" : "border-line-strong bg-card"
        }`}
      >
        <span className="text-[17px] font-semibold">{t.today}</span>
        <span className="text-[14px] text-muted">· {formatDayMonth(today, lang)}</span>
      </button>

      <p className="mb-2 mt-4 flex items-center gap-1.5 text-[14px] font-medium text-muted">
        <CalendarIcon size={17} className="shrink-0" />
        {t.pickOnCalendar}
      </p>

      <div
        role="group"
        aria-label={t.calendar}
        className={`rounded-2xl border-2 bg-card p-1.5 ${invalid ? "border-danger/60" : "border-line-strong"}`}
      >
        <div className="flex items-center justify-between gap-2 pb-1">
          <button type="button" className={navBtn} onClick={() => setMonth(addMonths(month, -1))} disabled={month <= monthStart(min)} aria-label={t.prevMonth}>
            <ChevronLeftIcon size={22} />
          </button>
          <p className="text-[17px] font-bold" aria-live="polite">
            {formatMonthYear(month, lang)}
          </p>
          <button type="button" className={navBtn} onClick={() => setMonth(addMonths(month, 1))} disabled={month >= monthStart(max)} aria-label={t.nextMonth}>
            <ChevronRightIcon size={22} />
          </button>
        </div>

        <div className="grid grid-cols-7 pb-1 text-center text-[12px] font-semibold text-muted" aria-hidden="true">
          {t.weekdays.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const off = day < min || day > max;
            const chosen = day === value;
            const inStay = !!rangeEnd && day > value && day <= rangeEnd;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                disabled={off}
                aria-pressed={chosen}
                aria-label={`${formatDayMonth(day, lang)} ${day.slice(0, 4)}${isToday ? ` (${t.today})` : ""}`}
                onClick={() => pick(day)}
                className={`tabular mx-auto flex h-10 w-full max-w-10 items-center justify-center rounded-full text-[16px] transition focus-visible:ring-4 focus-visible:ring-brand-tint ${
                  chosen
                    ? "bg-brand font-bold text-white"
                    : off
                      ? "text-ink/25"
                      : inStay
                        ? "bg-stay-soft font-semibold text-stay"
                        : isToday
                          ? "font-bold text-brand-strong ring-2 ring-inset ring-brand/50"
                          : "hover:bg-brand-soft active:bg-brand-tint"
                }`}
              >
                {Number(day.slice(8))}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
