"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { SearchIcon } from "../icons";

/** Search + seva + status filters for the admin entries list. Keeps the date range in the URL. */
export function FilterBar({
  lang,
  baseParams,
  q,
  seva,
  status,
}: {
  lang: Lang;
  baseParams: Record<string, string>;
  q: string;
  seva: string;
  status: string;
}) {
  const t = dict[lang];
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(next: { q?: string; seva?: string; status?: string }) {
    const params = new URLSearchParams(baseParams);
    const merged = { q: query, seva, status, ...next };
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.seva) params.set("seva", merged.seva);
    if (merged.status) params.set("status", merged.status);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const select =
    "h-11 rounded-xl border-2 border-line-strong bg-card px-3 text-[15px] font-medium outline-none transition focus:border-brand";

  return (
    <div className={`flex flex-wrap gap-2 transition-opacity ${pending ? "opacity-70" : ""}`}>
      <div className="relative min-w-[14rem] flex-1">
        <SearchIcon size={19} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setQuery(v);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply({ q: v }), 450);
          }}
          placeholder={t.searchPlaceholder}
          aria-label={t.search}
          className="h-11 w-full rounded-xl border-2 border-line-strong bg-card pl-10 pr-3 text-[16px] outline-none transition focus:border-brand"
        />
      </div>
      <select aria-label={t.seva} value={seva} onChange={(e) => apply({ seva: e.currentTarget.value })} className={select}>
        <option value="">{t.allSeva}</option>
        <option value="nashta">{t.nashta}</option>
        <option value="bhojan">{t.bhojan}</option>
        <option value="stay">{t.stay}</option>
      </select>
      <select aria-label={t.status} value={status} onChange={(e) => apply({ status: e.currentTarget.value })} className={select}>
        <option value="">{t.allStatus}</option>
        <option value="active">{t.statusActive}</option>
        <option value="cancelled">{t.statusCancelled}</option>
      </select>
    </div>
  );
}
