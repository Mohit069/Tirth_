import type { ReactNode } from "react";
import type { Dict } from "@/lib/i18n";
import type { DashboardData } from "@/lib/queries";
import { BedIcon, CupIcon, MoonIcon, MealIcon, TicketIcon, UsersIcon } from "../icons";

const fmt = new Intl.NumberFormat("en-IN");

function Tile({
  label,
  value,
  unit,
  sub,
  icon,
  className = "",
  hero = false,
}: {
  label: string;
  value: number;
  unit?: string;
  sub?: string;
  icon?: ReactNode;
  className?: string;
  hero?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>
      <div className="flex items-center gap-2 text-[14px] font-medium text-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`font-semibold leading-none text-ink ${hero ? "text-[52px]" : "text-[30px]"}`}>{fmt.format(value)}</span>
        {unit ? <span className="text-[14px] font-medium text-muted">{unit}</span> : null}
      </div>
      {sub ? <div className="mt-1.5 text-[14px] text-muted">{sub}</div> : null}
    </div>
  );
}

export function StatTiles({ data, t }: { data: DashboardData; t: Dict }) {
  const people = t.people.toLowerCase();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile
        hero
        className="col-span-2 bg-gradient-to-br from-brand-soft to-card"
        label={t.statYatri}
        value={data.yatri}
        icon={<UsersIcon size={18} className="text-brand" />}
      />
      <Tile label={t.statEntries} value={data.entries} icon={<TicketIcon size={18} className="text-brand" />} />
      <Tile label={t.statCancelled} value={data.cancelled} icon={<span className="size-2.5 rounded-full bg-danger" aria-hidden="true" />} />

      <Tile
        label={t.nashta}
        value={data.nashta.people}
        unit={people}
        sub={t.entriesUnit(data.nashta.entries)}
        icon={<CupIcon size={18} className="text-nashta" />}
      />
      <Tile
        label={t.bhojan}
        value={data.bhojan.people}
        unit={people}
        sub={t.entriesUnit(data.bhojan.entries)}
        icon={<MealIcon size={18} className="text-bhojan" />}
      />
      <Tile
        label={t.stay}
        value={data.stay.people}
        unit={people}
        sub={t.entriesUnit(data.stay.entries)}
        icon={<BedIcon size={18} className="text-stay" />}
      />
      <Tile
        label={t.statStayingNow}
        value={data.stayingNow.people}
        unit={people}
        sub={`${t.statStayingNowHint} · ${t.entriesUnit(data.stayingNow.entries)}`}
        icon={<MoonIcon size={18} className="text-stay" />}
      />
    </div>
  );
}
