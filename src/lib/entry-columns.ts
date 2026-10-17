import { formatIstTime, istDate } from "./dates";
import { idTypeLabel, vehicleLabel, type EntryView } from "./entry-rules";
import type { Dict } from "./i18n";

export type CellValue = string | number | null;

/** 1-based position of the "ID photo" column in `entryRow`; the Google Sheet puts the Drive link there. */
export const ID_PHOTO_COLUMN = 20;

/**
 * One entry as a row of values, in the order of `t.csvHeaders`.
 * Shared by the Excel (CSV) download and the Google Sheet, so both always have the same columns.
 */
export function entryRow(e: EntryView, t: Dict): CellValue[] {
  return [
    e.tokenNo,
    istDate(e.createdAt),
    formatIstTime(e.createdAt),
    e.name,
    e.mobile,
    e.city,
    e.men,
    e.women,
    e.children,
    e.totalPeople,
    e.wantsNashta ? t.yes : t.no,
    e.wantsBhojan ? t.yes : t.no,
    e.wantsStay ? t.yes : t.no,
    e.mealDate,
    e.mealPeople,
    e.checkInDate,
    e.checkOutDate,
    e.idType ? idTypeLabel(e.idType, t) : "",
    e.idNumberMasked,
    e.idPhotoUrl ?? (e.hasIdPhoto ? t.yes : ""), // ID_PHOTO_COLUMN
    e.vehicleType ? vehicleLabel(e.vehicleType, t) : "",
    e.vehicleNumber,
    e.status === "CANCELLED" ? t.statusCancelled : t.statusActive,
    e.cancelReason,
    e.cancelledAt ? `${istDate(e.cancelledAt)} ${formatIstTime(e.cancelledAt)}` : "",
    e.enteredBy === "STAFF" ? t.enteredByStaff : t.enteredByYatri,
  ];
}
