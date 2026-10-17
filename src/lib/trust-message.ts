import { formatDmy } from "./dates";
import { formatToken, nightsBetween, sevaNames, type EntryView } from "./entry-rules";
import type { Dict } from "./i18n";

/**
 * The yatri's details for the trust's WhatsApp number. It is sent from the yatri's own WhatsApp
 * (a wa.me link opens the chat with this text filled in), so it costs nothing and the yatri keeps
 * a copy in the chat.
 */
export function trustMessage(e: EntryView, t: Dict): string {
  const lines = [
    `${t.jaiJinendra} 🙏`,
    `${t.token}: #${formatToken(e.tokenNo)}`,
    `${t.colName}: ${e.name}`,
    `${t.colCity}: ${e.city}`,
    `${t.seva}: ${sevaNames(e, t).join(", ")}`,
    `${t.people}: ${e.totalPeople} (${t.peopleBreakdown(e.men, e.women, e.children)})`,
  ];
  if (e.mealDate) {
    const extra = e.mealPeople && e.mealPeople !== e.totalPeople ? ` (${t.peopleCount(e.mealPeople)})` : "";
    lines.push(`${e.wantsBhojan ? t.mealOn : t.nashtaOn}: ${formatDmy(e.mealDate)}${extra}`);
  }
  if (e.checkInDate && e.checkOutDate) {
    const nights = t.nightsCount(nightsBetween(e.checkInDate, e.checkOutDate));
    lines.push(`${t.stay}: ${t.dateRange(formatDmy(e.checkInDate), formatDmy(e.checkOutDate))} (${nights})`);
  }
  return lines.join("\n");
}

export function whatsAppLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
