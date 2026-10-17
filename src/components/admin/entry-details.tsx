import Link from "next/link";
import type { ReactNode } from "react";
import type { JobStatus } from "@/generated/prisma/client";
import { formatDmy, formatIstDateTime } from "@/lib/dates";
import { formatToken, idTypeLabel, nightsBetween, vehicleLabel, type EntryView } from "@/lib/entry-rules";
import type { Dict } from "@/lib/i18n";
import type { EntryJob } from "@/lib/jobs";
import { CancelledBadge, SevaBadges } from "../entry-bits";
import { CloseIcon, TicketIcon } from "../icons";
import { displayWhatsApp } from "./integrations";

export function EntryDetails({ entry: e, jobs, t, closeHref }: { entry: EntryView; jobs: EntryJob[]; t: Dict; closeHref: string }) {
  const cancelled = e.status === "CANCELLED";
  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-card px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted">{t.details}</p>
          <h2 className={`tabular text-[26px] font-bold leading-tight ${cancelled ? "text-muted line-through" : "text-brand-strong"}`}>
            #{formatToken(e.tokenNo)}
          </h2>
        </div>
        {cancelled ? <CancelledBadge t={t} /> : null}
        <Link
          href={closeHref}
          replace
          scroll={false}
          aria-label={t.close}
          className="grid size-10 place-items-center rounded-full border border-line-strong text-muted hover:bg-brand-soft"
        >
          <CloseIcon size={20} />
        </Link>
      </div>

      <dl className="divide-y divide-line px-5 text-[15px]">
        <Row label={t.entryTime}>{formatIstDateTime(e.createdAt)}</Row>
        <Row label={t.colName}>
          <span className="font-semibold">{e.name}</span>
        </Row>
        <Row label={t.colMobile}>
          <a href={`tel:+91${e.mobile}`} className="tabular font-semibold text-ok underline decoration-ok/30 underline-offset-2">
            {e.mobile}
          </a>
        </Row>
        <Row label={t.colCity}>{e.city}</Row>
        <Row label={t.seva}>
          <SevaBadges entry={e} t={t} size="sm" />
        </Row>
        <Row label={t.people}>
          <b>{e.totalPeople}</b> <span className="text-muted">({t.peopleBreakdown(e.men, e.women, e.children)})</span>
        </Row>
        {e.mealDate ? (
          <Row label={e.wantsBhojan ? t.mealOn : t.nashtaOn}>
            {formatDmy(e.mealDate)}
            {e.mealPeople ? <span className="text-muted"> · {t.peopleCount(e.mealPeople)}</span> : null}
          </Row>
        ) : null}
        {e.checkInDate && e.checkOutDate ? (
          <Row label={t.stay}>
            {t.dateRange(formatDmy(e.checkInDate), formatDmy(e.checkOutDate))}
            <span className="text-muted"> · {t.nightsCount(nightsBetween(e.checkInDate, e.checkOutDate))}</span>
          </Row>
        ) : null}
        {e.idNumberMasked ? (
          <Row label={t.idProof}>
            {idTypeLabel(e.idType, t)} <span className="tabular font-semibold">{e.idNumberMasked}</span>
          </Row>
        ) : null}
        {e.hasIdPhoto ? (
          <Row label={t.idPhotoTitle}>
            <a
              href={e.idPhotoUrl ?? `/admin/id-photo/${e.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ok underline decoration-ok/30 underline-offset-2"
            >
              {e.idPhotoUrl ? t.idPhotoInDrive : t.idPhotoOpen}
            </a>
          </Row>
        ) : null}
        {e.wantsStay ? (
          <Row label={t.vehicle}>
            {vehicleLabel(e.vehicleType, t)}
            {e.vehicleNumber ? <span className="tabular font-semibold"> {e.vehicleNumber}</span> : null}
          </Row>
        ) : null}
        <Row label={t.enteredBy}>{e.enteredBy === "STAFF" ? t.enteredByStaff : t.enteredByYatri}</Row>
        <Row label={t.status}>{cancelled ? t.statusCancelled : t.statusActive}</Row>
        {cancelled ? (
          <>
            <Row label={t.reason}>{e.cancelReason}</Row>
            {e.cancelledAt ? <Row label={t.cancelledAt}>{formatIstDateTime(e.cancelledAt)}</Row> : null}
          </>
        ) : null}
      </dl>

      {jobs.length ? (
        <section className="mx-5 mt-2 rounded-xl border border-line px-3 py-1">
          <h3 className="pt-2 text-[14px] font-semibold text-muted">{t.deliveryTitle}</h3>
          <ul className="divide-y divide-line text-[14px]">
            {jobs.map((j) => (
              <li key={`${j.kind}-${j.target}`} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {t[`job${j.kind}`]}
                    {j.target ? <span className="tabular text-muted"> · {displayWhatsApp(j.target)}</span> : null}
                  </span>
                  <JobBadge status={j.status} t={t} />
                </div>
                {j.lastError ? (
                  <p className="mt-0.5 break-words text-[12px] text-muted">
                    {j.lastError}
                    {j.attempts > 1 ? ` · ${t.jobTries(j.attempts)}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="px-5 pb-5 pt-3">
        <Link
          href={`/token/${e.id}`}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-line-strong text-[15px] font-semibold hover:bg-brand-soft"
        >
          <TicketIcon size={18} />
          {t.openTokenPage}
        </Link>
      </div>
    </div>
  );
}

const JOB_BADGE: Record<JobStatus, string> = {
  DONE: "bg-ok-soft text-ok",
  FAILED: "bg-danger-soft text-danger",
  PENDING: "bg-brand-soft text-brand-strong",
  RUNNING: "bg-brand-soft text-brand-strong",
  SKIPPED: "bg-paper text-muted",
};

function JobBadge({ status, t }: { status: JobStatus; t: Dict }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${JOB_BADGE[status]}`}>{t[`job${status}`]}</span>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}
