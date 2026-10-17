"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANG_COOKIE, dict, otherLang, type Lang } from "@/lib/i18n";
import { GlobeIcon } from "./icons";

export function LangToggle({ lang, onBrand = false }: { lang: Lang; onBrand?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = dict[lang];

  function switchLanguage() {
    document.cookie = `${LANG_COOKIE}=${otherLang(lang)}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      disabled={pending}
      aria-label={t.switchLanguageLabel}
      title={t.switchLanguageLabel}
      lang={otherLang(lang)}
      className={`no-print inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold transition active:scale-95 disabled:opacity-60 ${
        onBrand ? "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25" : "border border-line-strong bg-card text-ink shadow-sm hover:bg-brand-soft"
      }`}
    >
      <GlobeIcon size={17} className={onBrand ? "text-white" : "text-brand"} />
      {t.switchLanguage}
    </button>
  );
}
