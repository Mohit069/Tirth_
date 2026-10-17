import type { Metadata } from "next";
import Link from "next/link";
import { DailyChart } from "@/components/admin/daily-chart";
import { EntriesTable } from "@/components/admin/entries-table";
import { EntryDetails } from "@/components/admin/entry-details";
import { FilterBar } from "@/components/admin/filter-bar";
import { IntegrationsCard, type IntegrationState } from "@/components/admin/integrations";
import { Modal } from "@/components/admin/modal";
import { StatTiles } from "@/components/admin/stat-tiles";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "@/components/icons";
import { AdminNav } from "@/components/admin/admin-nav";
import { AppHeader } from "@/components/site-chrome";
import { requireRole } from "@/lib/auth";
import { formatDmy, istDate } from "@/lib/dates";
import { isUuid } from "@/lib/entry-rules";
import { sheetLink, sheetSetup } from "@/lib/google-sheet";
import { entryJobs, jobHealth } from "@/lib/jobs";
import { getDict } from "@/lib/lang";
import { adminEntries, dashboard, getEntry, type SevaFilter, type StatusFilter } from "@/lib/queries";
import { rangeParams, resolveRange, type RangePreset } from "@/lib/ranges";
import { whatsAppConfig } from "@/lib/whatsapp";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.adminTitle };
}

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireRole("admin");
  const { lang, t } = await getDict();
  const sp = await searchParams;
  const today = istDate();

  const range = resolveRange({ range: first(sp.range), from: first(sp.from), to: first(sp.to) }, today);
  const q = first(sp.q).trim().slice(0, 50);
  const sevaParam = first(sp.seva);
  const seva: SevaFilter = sevaParam === "nashta" || sevaParam === "bhojan" || sevaParam === "stay" ? sevaParam : "";
  const statusParam = first(sp.status);
  const status: StatusFilter = statusParam === "active" || statusParam === "cancelled" ? statusParam : "";
  const page = Math.max(1, Number.parseInt(first(sp.page), 10) || 1);
  const entryId = first(sp.entry);

  const selectedId = isUuid(entryId) ? entryId.toLowerCase() : null;
  const [dash, list, selected, selectedJobs, health] = await Promise.all([
    dashboard(range.from, range.to, today),
    adminEntries({ from: range.from, to: range.to, q, seva, status, page }),
    selectedId ? getEntry(selectedId) : Promise.resolve(null),
    selectedId ? entryJobs(selectedId) : Promise.resolve([]),
    jobHealth(),
  ]);

  const wa = whatsAppConfig();
  const sheet = sheetSetup();
  const integrations: IntegrationState = {
    whatsApp: { on: wa !== null, team: wa?.teamNumbers ?? [] },
    sheet: { state: sheet.ok ? "on" : sheet.reason === "invalid" ? "invalid" : "off", url: sheetLink() },
  };
  // Failures need attention, so the card moves to the top; otherwise it waits at the bottom.
  const integrationProblem = health.failed > 0 || health.waiting > 0;
  const integrationsCard = <IntegrationsCard state={integrations} health={health} t={t} lang={lang} />;

  const base = rangeParams(range);
  const filters: Record<string, string> = {};
  if (q) filters.q = q;
  if (seva) filters.seva = seva;
  if (status) filters.status = status;
  const href = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return qs ? `/admin?${qs}` : "/admin";
  };
  const pageParams: Record<string, string> = list.page > 1 ? { page: String(list.page) } : {};
  const currentHref = href({ ...base, ...filters, ...pageParams });
  const detailHref = (id: string) => href({ ...base, ...filters, ...pageParams, entry: id });

  const presets: { key: Exclude<RangePreset, "custom">; label: string }[] = [
    { key: "today", label: t.rangeToday },
    { key: "yesterday", label: t.rangeYesterday },
    { key: "month", label: t.rangeMonth },
  ];
  const pill = (on: boolean) =>
    `inline-flex h-10 cursor-pointer list-none items-center rounded-full border-2 px-4 text-[15px] font-semibold transition [&::-webkit-details-marker]:hidden ${
      on ? "border-ink bg-ink text-white" : "border-line-strong bg-card hover:bg-brand-soft"
    }`;
  const multiDay = range.from !== range.to;
  const hasYatri = dash.perDay.some((d) => d.yatri > 0);

  return (
    <>
      <AppHeader lang={lang} title={t.adminTitle} homeHref="/admin" logoutTo="admin">
        <AdminNav t={t} current="dashboard" />
      </AppHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pb-12 pt-4">
        {/* Date range: scopes everything below it */}
        <section aria-label={t.dashboard} className="space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            {presets.map((p) => (
              <Link key={p.key} href={href({ ...rangeParams({ preset: p.key, from: "", to: "" }), ...filters })} className={pill(range.preset === p.key)}>
                {p.label}
              </Link>
            ))}
            <details className="group" open={range.preset === "custom"}>
              <summary className={pill(range.preset === "custom")}>{t.rangeCustom}</summary>
              <form method="get" action="/admin" className="mt-2 flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-card p-3">
                <input type="hidden" name="range" value="custom" />
                {Object.entries(filters).map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
                <label className="text-[13px] font-medium text-muted">
                  {t.from}
                  <input
                    type="date"
                    name="from"
                    defaultValue={range.from}
                    max={today}
                    className="mt-1 block h-11 rounded-xl border-2 border-line-strong bg-card px-3 text-[15px] text-ink"
                  />
                </label>
                <label className="text-[13px] font-medium text-muted">
                  {t.to}
                  <input
                    type="date"
                    name="to"
                    defaultValue={range.to}
                    max={today}
                    className="mt-1 block h-11 rounded-xl border-2 border-line-strong bg-card px-3 text-[15px] text-ink"
                  />
                </label>
                <button type="submit" className="h-11 rounded-xl bg-brand px-5 text-[15px] font-bold text-white">
                  {t.show}
                </button>
              </form>
            </details>
          </div>
          <p className="text-[15px] text-muted">
            <span className="font-semibold text-ink">{t.showingRange(formatDmy(range.from), formatDmy(range.to))}</span>
          </p>
        </section>

        {integrationProblem ? integrationsCard : null}

        <StatTiles data={dash} t={t} />

        {multiDay ? (
          <section className="rounded-2xl border border-line bg-card p-4">
            <h2 className="text-[17px] font-bold">{t.chartTitle}</h2>
            <p className="mb-3 text-[13px] text-muted">{t.showingRange(formatDmy(range.from), formatDmy(range.to))}</p>
            {hasYatri ? (
              <>
                <DailyChart data={dash.perDay} label={`${t.chartTitle}, ${t.showingRange(formatDmy(range.from), formatDmy(range.to))}`} unit={t.colYatri} />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[14px] font-semibold text-brand-strong">{t.chartTableView}</summary>
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-line">
                    <table className="w-full text-[14px]">
                      <thead className="sticky top-0 bg-paper">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-muted">{t.colDate}</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted">{t.colYatri}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dash.perDay.map((d) => (
                          <tr key={d.date} className="border-t border-line">
                            <td className="tabular px-3 py-1.5">{formatDmy(d.date)}</td>
                            <td className="tabular px-3 py-1.5 text-right font-semibold">{d.yatri}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <p className="py-10 text-center text-[15px] text-muted">{t.chartEmpty}</p>
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[20px] font-bold">
              {t.entriesTitle} <span className="text-[15px] font-medium text-muted">· {t.showingCount(list.total)}</span>
            </h2>
            <a
              href={`/admin/export${Object.keys(base).length ? `?${new URLSearchParams(base)}` : ""}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-ok/40 bg-ok-soft px-4 text-[15px] font-bold text-ok transition hover:bg-ok hover:text-white"
            >
              <DownloadIcon size={19} />
              {t.download}
            </a>
          </div>

          <FilterBar lang={lang} baseParams={base} q={q} seva={seva} status={status} />

          {list.entries.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-line-strong bg-card/60 px-4 py-12 text-center text-[16px] text-muted">
              {q || seva || status ? t.noMatches : t.noEntriesInRange}
              {q || seva || status ? (
                <div className="mt-3">
                  <Link href={href(base)} className="font-semibold text-brand-strong underline underline-offset-2">
                    {t.clearFilters}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <EntriesTable entries={list.entries} t={t} detailHref={detailHref} />
          )}

          {list.pages > 1 ? (
            <nav className="flex items-center justify-between gap-2" aria-label={t.pageOf(list.page, list.pages)}>
              {list.page > 1 ? (
                <Link
                  href={href({ ...base, ...filters, ...(list.page > 2 ? { page: String(list.page - 1) } : {}) })}
                  className="inline-flex h-11 items-center gap-1 rounded-xl border-2 border-line-strong bg-card px-4 font-semibold"
                >
                  <ChevronLeftIcon size={18} />
                  {t.prev}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-[14px] text-muted">{t.pageOf(list.page, list.pages)}</span>
              {list.page < list.pages ? (
                <Link
                  href={href({ ...base, ...filters, page: String(list.page + 1) })}
                  className="inline-flex h-11 items-center gap-1 rounded-xl border-2 border-line-strong bg-card px-4 font-semibold"
                >
                  {t.next}
                  <ChevronRightIcon size={18} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>

        {integrationProblem ? null : integrationsCard}
      </main>

      {selected ? (
        <Modal title={t.tokenTitle(String(selected.tokenNo).padStart(4, "0"))} closeHref={currentHref} closeLabel={t.close}>
          <EntryDetails entry={selected} jobs={selectedJobs} t={t} closeHref={currentHref} />
        </Modal>
      ) : null}
    </>
  );
}
