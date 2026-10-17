import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { trustWhatsApp, trustWhatsAppDisplay } from "@/lib/config";
import { dict, otherLang, type Lang } from "@/lib/i18n";
import { LogoutIcon, ShikharIcon, WhatsAppIcon } from "./icons";
import { LangToggle } from "./lang-toggle";

/** Header for yatri-facing pages. */
export function PublicHeader({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const altLang = otherLang(lang);
  return (
    <header className="no-print">
      <div className="bg-brand text-white">
        <div className="mx-auto flex h-12 max-w-xl items-center justify-between gap-3 px-4">
          <span className="text-[15px] font-semibold tracking-wide">🙏 {t.jaiJinendra}</span>
          <LangToggle lang={lang} onBrand />
        </div>
      </div>
      <div className="border-b border-line bg-card">
        <Link href="/" className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand ring-1 ring-brand-tint">
            <ShikharIcon size={30} />
          </span>
          <span className="min-w-0">
            <span className="block text-[18px] font-bold leading-snug text-ink">{t.trustName}</span>
            <span className="block text-[12px] leading-snug text-muted" lang={altLang}>
              {dict[altLang].trustName}
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const t = dict[lang];
  return (
    <footer className="no-print mt-auto border-t border-line bg-card/70">
      <div className="mx-auto max-w-xl space-y-1.5 px-4 py-6 text-center text-[13px] leading-relaxed text-muted">
        <p className="text-[14px] font-semibold text-ink">{t.trustName}</p>
        <p>{t.managedBy}</p>
        <p>{t.address}</p>
        <p className="pt-1">
          <a
            href={`https://wa.me/${trustWhatsApp()}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 font-semibold text-ok"
          >
            <WhatsAppIcon size={16} />
            {t.whatsapp}: {trustWhatsAppDisplay()}
          </a>
        </p>
      </div>
    </footer>
  );
}

/** Compact sticky header for the staff and admin screens. */
export function AppHeader({
  lang,
  title,
  homeHref,
  logoutTo,
  children,
}: {
  lang: Lang;
  title: string;
  homeHref: string;
  logoutTo: "staff" | "admin";
  children?: ReactNode;
}) {
  const t = dict[lang];
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <ShikharIcon size={22} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-bold leading-tight">{title}</span>
            <span className="block truncate text-[11px] leading-tight text-muted">{t.trustName}</span>
          </span>
        </Link>
        <LangToggle lang={lang} />
        <form action={logout}>
          <input type="hidden" name="to" value={logoutTo} />
          <button
            type="submit"
            title={t.logout}
            aria-label={t.logout}
            className="grid size-9 place-items-center rounded-full border border-line-strong bg-card text-muted transition hover:text-danger active:scale-95"
          >
            <LogoutIcon size={18} />
          </button>
        </form>
      </div>
      {children ? <div className="mx-auto max-w-5xl px-4 pb-2">{children}</div> : null}
    </header>
  );
}
