import type { Metadata } from "next";
import Link from "next/link";
import { GridIcon, PlusIcon } from "@/components/icons";
import { AppHeader } from "@/components/site-chrome";
import { AutoRefresh } from "@/components/staff/auto-refresh";
import { EntryCard } from "@/components/staff/entry-card";
import { StaffSearch } from "@/components/staff/staff-search";
import { requireRole } from "@/lib/auth";
import { formatDmy, formatIstTime, istDate } from "@/lib/dates";
import { getDict } from "@/lib/lang";
import { SEARCH_LIMIT, STAFF_TABS, staffData, type StaffTab } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.staffCounter };
}

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function StaffPage({ searchParams }: PageProps<"/staff">) {
  const role = await requireRole("staff");
  const { lang, t } = await getDict();
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 50);
  const tabParam = first(sp.tab);
  const tab: StaffTab = (STAFF_TABS as readonly string[]).includes(tabParam) ? (tabParam as StaffTab) : "all";

  const today = istDate();
  const { entries: shown, counts, activeEntries, activePeople, truncated } = await staffData(q, tab, today);

  const tabLabel: Record<StaffTab, string> = {
    all: t.tabAll,
    nashta: t.nashta,
    bhojan: t.bhojan,
    stay: t.stay,
    cancelled: t.tabCancelled,
  };
  const tabHref = (k: StaffTab) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (k !== "all") params.set("tab", k);
    const qs = params.toString();
    return qs ? `/staff?${qs}` : "/staff";
  };

  return (
    <>
      <AppHeader lang={lang} title={t.staffCounter} homeHref="/staff" logoutTo="staff" />
      <AutoRefresh seconds={30} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-[17px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(180,65,14,0.7)] transition hover:bg-brand-strong active:scale-95"
          >
            <PlusIcon size={21} />
            {t.newEntry}
          </Link>
          {role === "admin" ? (
            <Link
              href="/admin"
              className="inline-flex h-12 items-center gap-2 rounded-xl border-2 border-line-strong bg-card px-4 text-[16px] font-semibold"
            >
              <GridIcon size={19} />
              {t.admin}
            </Link>
          ) : null}
          <div className="min-w-[16rem] flex-1">
            <StaffSearch lang={lang} q={q} tab={tab} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h1 className="text-[22px] font-bold leading-tight">
            {q ? t.searchingAllDates(q) : `${t.todaysEntries} · ${formatDmy(today)}`}
          </h1>
          <p className="text-[14px] text-muted">
            <span className="font-semibold text-ink">{t.summary(activeEntries, activePeople)}</span>
            <span className="mx-2">·</span>
            {t.updatedAt(formatIstTime(new Date()))}
          </p>
        </div>

        <nav className="-mx-4 mt-3 overflow-x-auto px-4 pb-1" aria-label={t.seva}>
          <ul className="flex w-max gap-2">
            {STAFF_TABS.map((k) => {
              const count = counts[k];
              const current = k === tab;
              return (
                <li key={k}>
                  <Link
                    href={tabHref(k)}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-semibold transition ${
                      current ? "border-ink bg-ink text-white" : "border-line-strong bg-card text-ink hover:bg-brand-soft"
                    }`}
                  >
                    {tabLabel[k]}
                    <span
                      className={`tabular min-w-6 rounded-full px-1.5 text-center text-[13px] ${current ? "bg-white/20" : "bg-paper text-muted"}`}
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {shown.length === 0 ? (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-line-strong bg-card/60 px-4 py-12 text-center text-[16px] text-muted">
            {q ? t.noMatches : tab === "all" ? t.noEntriesToday : t.noEntries}
          </div>
        ) : (
          <>
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {shown.map((e) => (
                <EntryCard key={e.id} entry={e} lang={lang} today={today} />
              ))}
            </ul>
            {truncated ? (
              <p className="mt-4 rounded-xl bg-card px-4 py-3 text-center text-[14px] text-muted">
                {q ? t.searchTruncated(SEARCH_LIMIT) : t.listTruncated(shown.length, counts[tab])}
              </p>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
