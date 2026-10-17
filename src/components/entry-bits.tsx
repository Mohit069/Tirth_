import type { EntryView } from "@/lib/entry-rules";
import type { Dict } from "@/lib/i18n";
import { BedIcon, CupIcon, MealIcon } from "./icons";

const badge = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-6";

export function SevaBadges({ entry, t, size = "md" }: { entry: Pick<EntryView, "wantsNashta" | "wantsBhojan" | "wantsStay">; t: Dict; size?: "sm" | "md" }) {
  const icon = size === "sm" ? 14 : 16;
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {entry.wantsNashta ? (
        <span className={`${badge} bg-nashta-soft text-nashta`}>
          <CupIcon size={icon} />
          {t.nashta}
        </span>
      ) : null}
      {entry.wantsBhojan ? (
        <span className={`${badge} bg-bhojan-soft text-bhojan`}>
          <MealIcon size={icon} />
          {t.bhojan}
        </span>
      ) : null}
      {entry.wantsStay ? (
        <span className={`${badge} bg-stay-soft text-stay`}>
          <BedIcon size={icon} />
          {t.stay}
        </span>
      ) : null}
    </span>
  );
}

/** Compact seva marks for narrow tables: coloured icon + screen-reader label. */
export function SevaIcons({ entry, t }: { entry: Pick<EntryView, "wantsNashta" | "wantsBhojan" | "wantsStay">; t: Dict }) {
  const dot = "grid size-7 place-items-center rounded-full";
  return (
    <span className="inline-flex gap-1">
      {entry.wantsNashta ? (
        <span className={`${dot} bg-nashta-soft text-nashta`} title={t.nashta}>
          <CupIcon size={15} />
          <span className="sr-only">{t.nashta}</span>
        </span>
      ) : null}
      {entry.wantsBhojan ? (
        <span className={`${dot} bg-bhojan-soft text-bhojan`} title={t.bhojan}>
          <MealIcon size={15} />
          <span className="sr-only">{t.bhojan}</span>
        </span>
      ) : null}
      {entry.wantsStay ? (
        <span className={`${dot} bg-stay-soft text-stay`} title={t.stay}>
          <BedIcon size={15} />
          <span className="sr-only">{t.stay}</span>
        </span>
      ) : null}
    </span>
  );
}

export function CancelledBadge({ t }: { t: Dict }) {
  return <span className={`${badge} bg-danger-soft text-danger`}>{t.cancelled}</span>;
}

export function StaffBadge({ t }: { t: Dict }) {
  return <span className={`${badge} bg-stay-soft/70 text-[12px] text-stay`}>{t.byStaff}</span>;
}
