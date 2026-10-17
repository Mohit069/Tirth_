import type { IconName } from "@/components/icon-paths";
import { formatDmy, formatIstDateTime } from "./dates";
import { formatToken, nightsBetween, type EntryView } from "./entry-rules";
import { dict, otherLang, type Lang } from "./i18n";

/** A piece of a card value. `strong` = bold, `semi` = semibold, `muted` = grey. */
export type CardRun = { text: string; style?: "strong" | "semi" | "muted" };

export type Seva = "nashta" | "bhojan" | "stay";

export type CardRow =
  | { kind: "text"; label: string; icon?: IconName; runs: CardRun[]; large?: boolean }
  | { kind: "seva"; label: string; sevas: { key: Seva; label: string }[] };

/**
 * Everything the token card shows, as plain text in the page language. The token page renders it
 * as HTML and the share button draws the same data into the token photo, so the two always match.
 */
export type TokenCard = {
  lang: Lang;
  token: string;
  tokenLabel: string;
  tokenLabelAlt: string;
  createdAt: string;
  trustName: string;
  trustNameAlt: string;
  showAtCounter: string;
  rows: CardRow[];
};

/** Joins words with no-break spaces, so short tails like "· 2 रात" never split across lines. */
function together(text: string): string {
  return text.replace(/ /g, "\u00a0");
}

export function tokenCard(e: EntryView, lang: Lang): TokenCard {
  const t = dict[lang];
  const alt = dict[otherLang(lang)];

  const sevas: { key: Seva; label: string }[] = [];
  if (e.wantsNashta) sevas.push({ key: "nashta", label: t.nashta });
  if (e.wantsBhojan) sevas.push({ key: "bhojan", label: t.bhojan });
  if (e.wantsStay) sevas.push({ key: "stay", label: t.stay });

  const rows: CardRow[] = [
    { kind: "text", label: t.colName, runs: [{ text: e.name, style: "strong" }], large: true },
    { kind: "text", label: t.colCity, icon: "mapPin", runs: [{ text: e.city }] },
    { kind: "seva", label: t.seva, sevas },
    {
      kind: "text",
      label: t.people,
      icon: "users",
      runs: [
        { text: String(e.totalPeople), style: "strong" },
        { text: ` (${t.peopleBreakdown(e.men, e.women, e.children)})`, style: "muted" },
      ],
    },
  ];
  if (e.mealDate) {
    const runs: CardRun[] = [{ text: formatDmy(e.mealDate), style: "semi" }];
    if (e.mealPeople) runs.push({ text: ` ${together(`· ${t.peopleCount(e.mealPeople)}`)}`, style: "muted" });
    rows.push({ kind: "text", label: e.wantsBhojan ? t.mealOn : t.nashtaOn, icon: "calendar", runs });
  }
  if (e.checkInDate && e.checkOutDate) {
    rows.push({
      kind: "text",
      label: t.stay,
      icon: "calendar",
      runs: [
        { text: t.dateRange(formatDmy(e.checkInDate), formatDmy(e.checkOutDate)), style: "semi" },
        { text: ` ${together(`· ${t.nightsCount(nightsBetween(e.checkInDate, e.checkOutDate))}`)}`, style: "muted" },
      ],
    });
  }

  return {
    lang,
    token: formatToken(e.tokenNo),
    tokenLabel: t.token,
    tokenLabelAlt: alt.token,
    createdAt: formatIstDateTime(e.createdAt),
    trustName: t.trustName,
    trustNameAlt: alt.trustName,
    showAtCounter: t.showAtCounter,
    rows,
  };
}
