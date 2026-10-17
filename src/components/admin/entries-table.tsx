import Link from "next/link";
import { formatDm, formatIstDateTime } from "@/lib/dates";
import { formatToken, type EntryView } from "@/lib/entry-rules";
import type { Dict } from "@/lib/i18n";
import { CancelledBadge, SevaBadges, SevaIcons } from "../entry-bits";

export function EntriesTable({ entries, t, detailHref }: { entries: EntryView[]; t: Dict; detailHref: (id: string) => string }) {
  const th = "px-3 py-2.5 text-[13px] font-semibold text-muted";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <table className="w-full border-collapse text-left text-[15px]">
        <thead className="bg-paper/80">
          <tr>
            <th className={th}>{t.colToken}</th>
            <th className={`${th} hidden lg:table-cell`}>{t.colTime}</th>
            <th className={th}>{t.colName}</th>
            <th className={`${th} hidden md:table-cell`}>{t.colMobile}</th>
            <th className={`${th} hidden md:table-cell`}>{t.colCity}</th>
            <th className={th}>{t.colSeva}</th>
            <th className={`${th} text-right`}>{t.colPeople}</th>
            <th className={`${th} hidden lg:table-cell`}>{t.colStay}</th>
            <th className={`${th} hidden sm:table-cell`}>{t.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const cancelled = e.status === "CANCELLED";
            return (
              <tr key={e.id} className={`relative border-t border-line transition-colors hover:bg-brand-soft/60 ${cancelled ? "text-muted" : ""}`}>
                <td className="px-3 py-3 align-top">
                  <Link
                    href={detailHref(e.id)}
                    scroll={false}
                    className={`tabular font-bold after:absolute after:inset-0 after:content-[''] ${cancelled ? "line-through" : "text-brand-strong"}`}
                    aria-label={`${t.details}: ${t.tokenTitle(formatToken(e.tokenNo))}, ${e.name}`}
                  >
                    #{formatToken(e.tokenNo)}
                  </Link>
                </td>
                <td className="tabular hidden whitespace-nowrap px-3 py-3 align-top text-[14px] text-muted lg:table-cell">
                  {formatIstDateTime(e.createdAt)}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold leading-snug">{e.name}</div>
                  <div className="text-[13px] leading-snug text-muted md:hidden">
                    {e.city} · <span className="tabular">{e.mobile}</span>
                  </div>
                  {cancelled ? (
                    <div className="mt-1 sm:hidden">
                      <CancelledBadge t={t} />
                    </div>
                  ) : null}
                </td>
                <td className="tabular hidden px-3 py-3 align-top md:table-cell">{e.mobile}</td>
                <td className="hidden px-3 py-3 align-top md:table-cell">{e.city}</td>
                <td className="px-3 py-3 align-top">
                  <span className="md:hidden">
                    <SevaIcons entry={e} t={t} />
                  </span>
                  <span className="hidden md:inline">
                    <SevaBadges entry={e} t={t} size="sm" />
                  </span>
                </td>
                <td className="tabular px-3 py-3 text-right align-top font-semibold">{e.totalPeople}</td>
                <td className="tabular hidden whitespace-nowrap px-3 py-3 align-top text-[14px] lg:table-cell">
                  {e.checkInDate && e.checkOutDate ? `${formatDm(e.checkInDate)} → ${formatDm(e.checkOutDate)}` : "—"}
                </td>
                <td className="hidden px-3 py-3 align-top sm:table-cell">
                  {cancelled ? <CancelledBadge t={t} /> : <span className="text-[14px] text-ok">{t.statusActive}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
