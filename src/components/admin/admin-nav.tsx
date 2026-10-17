import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { GridIcon, ListIcon, QrIcon } from "../icons";

export function AdminNav({ t, current }: { t: Dict; current: "dashboard" | "qr" }) {
  const item = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[14px] font-semibold transition ${
      on ? "bg-brand-soft text-brand-strong ring-1 ring-brand-tint" : "text-muted hover:bg-paper hover:text-ink"
    }`;
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1">
      <Link href="/admin" className={item(current === "dashboard")} aria-current={current === "dashboard" ? "page" : undefined}>
        <GridIcon size={16} className="hidden sm:block" />
        {t.dashboard}
      </Link>
      <Link href="/staff" className={item(false)}>
        <ListIcon size={16} className="hidden sm:block" />
        {t.staffCounter}
      </Link>
      <Link href="/admin/qr" className={item(current === "qr")} aria-current={current === "qr" ? "page" : undefined}>
        <QrIcon size={16} className="hidden sm:block" />
        {t.printQr}
      </Link>
    </nav>
  );
}
