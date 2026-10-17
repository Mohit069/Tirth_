"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { CloseIcon, SearchIcon } from "../icons";

/** Search box for /staff. Updates the URL (?q=) as you type. */
export function StaffSearch({ lang, q, tab }: { lang: Lang; q: string; tab: string }) {
  const t = dict[lang];
  const router = useRouter();
  const [value, setValue] = useState(q);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: string) {
    const params = new URLSearchParams();
    if (next.trim()) params.set("q", next.trim());
    if (tab !== "all") params.set("tab", tab);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/staff?${qs}` : "/staff", { scroll: false }));
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        go(value);
      }}
      className="relative"
    >
      <SearchIcon size={20} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${pending ? "animate-pulse text-brand" : "text-muted"}`} />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          const next = e.currentTarget.value;
          setValue(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => go(next), 450);
        }}
        placeholder={t.searchPlaceholder}
        aria-label={t.search}
        enterKeyHint="search"
        className="h-12 w-full rounded-xl border-2 border-line-strong bg-card pl-11 pr-11 text-[17px] outline-none transition focus:border-brand [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            clearTimeout(timer.current);
            go("");
          }}
          aria-label={t.clearSearch}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-brand-soft"
        >
          <CloseIcon size={18} />
        </button>
      ) : null}
    </form>
  );
}
