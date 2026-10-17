import type { ReactNode } from "react";
import { formatDm, formatDmy, formatIstTime, istDate } from "@/lib/dates";
import { formatToken, idTypeLabel, nightsBetween, vehicleLabel, type EntryView } from "@/lib/entry-rules";
import { dict, type Lang } from "@/lib/i18n";
import { CancelledBadge, SevaBadges, StaffBadge } from "../entry-bits";
import { BedIcon, CarIcon, ClockIcon, IdCardIcon, MapPinIcon, PhoneIcon, MealIcon, UsersIcon } from "../icons";
import { CancelEntryButton } from "./cancel-entry-button";

export function EntryCard({ entry, lang, today }: { entry: EntryView; lang: Lang; today: string }) {
  const t = dict[lang];
  const token = formatToken(entry.tokenNo);
  const cancelled = entry.status === "CANCELLED";
  const createdDay = istDate(entry.createdAt);
  const mobileDisplay = `${entry.mobile.slice(0, 5)} ${entry.mobile.slice(5)}`;

  return (
    <li className={`rounded-2xl border bg-card p-4 shadow-[0_1px_3px_rgba(35,28,23,0.05)] ${cancelled ? "border-danger/25 bg-[#fffaf9]" : "border-line"}`}>
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 rounded-xl px-2.5 py-1.5 text-center ${cancelled ? "bg-[#f1ebe6] text-muted" : "bg-brand-soft text-brand-strong"}`}
        >
          <div className="text-[11px] font-medium leading-none">{t.token}</div>
          <div className={`tabular text-[22px] font-bold leading-tight ${cancelled ? "line-through" : ""}`}>#{token}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-[18px] font-bold leading-snug">{entry.name}</h3>
            {cancelled ? <CancelledBadge t={t} /> : null}
            {entry.enteredBy === "STAFF" ? <StaffBadge t={t} /> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[14px] text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon size={15} />
              {entry.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon size={15} />
              {createdDay !== today ? `${formatDmy(createdDay)}, ` : ""}
              {formatIstTime(entry.createdAt)}
            </span>
          </div>
        </div>
        <a
          href={`tel:+91${entry.mobile}`}
          aria-label={`${t.call} ${mobileDisplay}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok transition active:scale-90"
        >
          <PhoneIcon size={20} />
        </a>
      </div>

      <div className="mt-3">
        <SevaBadges entry={entry} t={t} />
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-[15px] sm:grid-cols-2">
        <Item icon={<UsersIcon size={16} />} label={t.people}>
          <b>{entry.totalPeople}</b> <span className="text-muted">({t.peopleBreakdown(entry.men, entry.women, entry.children)})</span>
        </Item>
        <Item icon={<PhoneIcon size={16} />} label={t.colMobile}>
          <a href={`tel:+91${entry.mobile}`} className="tabular font-semibold text-ok underline decoration-ok/30 underline-offset-2">
            {mobileDisplay}
          </a>
        </Item>
        {entry.mealDate ? (
          <Item icon={<MealIcon size={16} />} label={entry.wantsBhojan ? t.mealOn : t.nashtaOn}>
            <b>{formatDm(entry.mealDate)}</b>
            {entry.mealPeople ? <span className="text-muted"> · {t.peopleCount(entry.mealPeople)}</span> : null}
          </Item>
        ) : null}
        {entry.checkInDate && entry.checkOutDate ? (
          <Item icon={<BedIcon size={16} />} label={t.stay}>
            <b>
              {formatDm(entry.checkInDate)} → {formatDm(entry.checkOutDate)}
            </b>
            <span className="text-muted"> · {t.nightsCount(nightsBetween(entry.checkInDate, entry.checkOutDate))}</span>
          </Item>
        ) : null}
        {entry.idNumberMasked ? (
          <Item icon={<IdCardIcon size={16} />} label={t.idProof}>
            {idTypeLabel(entry.idType, t)} <span className="tabular font-semibold">{entry.idNumberMasked}</span>
            {entry.hasIdPhoto ? (
              <>
                {" · "}
                <a
                  href={entry.idPhotoUrl ?? `/admin/id-photo/${entry.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-ok underline decoration-ok/30 underline-offset-2"
                >
                  {t.idPhotoOpen}
                </a>
              </>
            ) : null}
          </Item>
        ) : null}
        {entry.vehicleType ? (
          <Item icon={<CarIcon size={16} />} label={t.vehicle}>
            {vehicleLabel(entry.vehicleType, t)}
            {entry.vehicleNumber ? <span className="tabular font-semibold"> {entry.vehicleNumber}</span> : null}
          </Item>
        ) : null}
      </dl>

      {cancelled ? (
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-[14px] text-danger">
          <b>{t.reason}:</b> {entry.cancelReason}
        </p>
      ) : (
        <div className="mt-3 flex justify-end border-t border-line pt-3">
          <CancelEntryButton lang={lang} entryId={entry.id} token={token} />
        </div>
      )}
    </li>
  );
}

function Item({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="mt-[3px] shrink-0 text-muted">
        <span aria-hidden="true">{icon}</span>
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 leading-snug">{children}</dd>
    </div>
  );
}
