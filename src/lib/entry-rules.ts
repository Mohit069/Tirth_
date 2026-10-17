// Rules shared by the yatri form (in the browser) and the server.
// Keep this file free of server-only imports.

import { addDays, daysBetween, isYmd } from "./dates";
import type { Dict } from "./i18n";

export const ID_TYPES = ["AADHAAR", "VOTER_ID", "DRIVING_LICENCE", "PASSPORT", "OTHER"] as const;
export type IdType = (typeof ID_TYPES)[number];

export const VEHICLE_TYPES = ["CAR", "JEEP", "BUS", "OTHER"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/** The optional ID photo is shrunk on the phone to a JPEG of at most this size. */
export const ID_PHOTO_MAX_BYTES = 900_000;
const ID_PHOTO_PREFIX = "data:image/jpeg;base64,";

/** The ID photo as the form sends it: a JPEG data URL within the size limit. */
export function isIdPhotoDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith(ID_PHOTO_PREFIX)) return false;
  const b64 = value.slice(ID_PHOTO_PREFIX.length);
  return /^[A-Za-z0-9+/]+={0,2}$/.test(b64) && (b64.length * 3) / 4 <= ID_PHOTO_MAX_BYTES;
}

export const MAX_COUNT = 500;
export const MAX_NIGHTS = 30;
/** How far staff may back-date or pre-date an entry. */
export const STAFF_DATE_WINDOW_DAYS = 30;
/** How far ahead a yatri may pick the check-in date on the calendar. Meals: today or tomorrow only. */
export const STAY_ADVANCE_DAYS = 30;

/**
 * What the form sends to the server. The ID number never leaves the phone in
 * full: the form sends only its last 4 characters.
 */
export type EntryPayload = {
  id: string;
  nashta: boolean;
  bhojan: boolean;
  stay: boolean;
  name: string;
  mobile: string;
  city: string;
  men: number;
  women: number;
  children: number;
  mealDate: string | null;
  mealPeople: number | null;
  checkInDate: string | null;
  nights: number | null;
  idType: string | null;
  idLast4: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
};

export type FieldName =
  | "seva"
  | "name"
  | "mobile"
  | "city"
  | "men"
  | "women"
  | "children"
  | "people"
  | "mealDate"
  | "mealPeople"
  | "checkInDate"
  | "nights"
  | "idType"
  | "idNumber"
  | "idPhoto"
  | "vehicleNumber";

type ErrorKey = Extract<keyof Dict, `err${string}`>;
export type FieldErrors = Partial<Record<FieldName, ErrorKey>>;

/** Normalised values, ready to store. */
export type CleanEntry = {
  name: string;
  mobile: string;
  city: string;
  men: number;
  women: number;
  children: number;
  totalPeople: number;
  wantsNashta: boolean;
  wantsBhojan: boolean;
  wantsStay: boolean;
  mealDate: string | null;
  mealPeople: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  idType: IdType | null;
  idNumberMasked: string | null;
  vehicleType: VehicleType | null;
  vehicleNumber: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Random entry id made on the phone (works on plain http too, unlike randomUUID). */
export function newEntryId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      // not a secure context, fall through
    }
  }
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Accepts "98765 43210", "+91 98765 43210", "098765..." and returns 10 digits (or the raw digits if invalid). */
export function normalizeMobile(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

/** Runs in the browser: checks the full ID number and returns only its last 4 characters. */
export function idLast4FromInput(idType: IdType, raw: string): { last4: string } | { error: ErrorKey } {
  const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (idType === "AADHAAR") {
    if (!/^[2-9]\d{11}$/.test(clean)) return { error: "errAadhaar" };
  } else if (clean.length < 4 || clean.length > 20) {
    return { error: "errIdNumber" };
  }
  return { last4: clean.slice(-4) };
}

export function maskId(idType: IdType, last4: string): string {
  return idType === "AADHAAR" ? `XXXX-XXXX-${last4}` : `XXXXXX${last4}`;
}

export function cleanVehicleNumber(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** Dates a yatri / staff member may choose for a meal or for check-in. */
export function allowedDateWindow(today: string, isStaff: boolean, kind: "meal" | "checkIn"): { min: string; max: string } {
  if (isStaff) return { min: addDays(today, -STAFF_DATE_WINDOW_DAYS), max: addDays(today, STAFF_DATE_WINDOW_DAYS) };
  return { min: today, max: addDays(today, kind === "checkIn" ? STAY_ADVANCE_DAYS : 1) };
}

function isCount(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_COUNT;
}

function inWindow(ymd: string, w: { min: string; max: string }): boolean {
  return ymd >= w.min && ymd <= w.max;
}

export function validateEntry(
  p: EntryPayload,
  opts: { today: string; isStaff: boolean },
): { ok: true; entry: CleanEntry } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  if (!p.nashta && !p.bhojan && !p.stay) errors.seva = "errSeva";

  const name = cleanText(p.name).slice(0, 60);
  if (name.length < 2) errors.name = "errName";

  const mobile = normalizeMobile(p.mobile);
  if (!isValidMobile(mobile)) errors.mobile = "errMobile";

  const city = cleanText(p.city).slice(0, 60);
  if (city.length < 2) errors.city = "errCity";

  if (!isCount(p.men)) errors.men = "errCount";
  if (!isCount(p.women)) errors.women = "errCount";
  if (!isCount(p.children)) errors.children = "errCount";
  const totalPeople = (isCount(p.men) ? p.men : 0) + (isCount(p.women) ? p.women : 0) + (isCount(p.children) ? p.children : 0);
  if (!errors.men && !errors.women && !errors.children && totalPeople < 1) errors.people = "errPeople";

  const wantsMeal = p.nashta || p.bhojan;
  let mealDate: string | null = null;
  let mealPeople: number | null = null;
  if (wantsMeal) {
    if (!isYmd(p.mealDate) || !inWindow(p.mealDate, allowedDateWindow(opts.today, opts.isStaff, "meal"))) errors.mealDate = "errDate";
    else mealDate = p.mealDate;
    if (typeof p.mealPeople !== "number" || !Number.isInteger(p.mealPeople) || p.mealPeople < 1 || p.mealPeople > MAX_COUNT * 3) {
      errors.mealPeople = "errMealPeople";
    } else {
      mealPeople = p.mealPeople;
    }
  }

  let checkInDate: string | null = null;
  let checkOutDate: string | null = null;
  let idType: IdType | null = null;
  let idNumberMasked: string | null = null;
  let vehicleType: VehicleType | null = null;
  let vehicleNumber: string | null = null;
  if (p.stay) {
    if (!isYmd(p.checkInDate) || !inWindow(p.checkInDate, allowedDateWindow(opts.today, opts.isStaff, "checkIn"))) errors.checkInDate = "errDate";
    else checkInDate = p.checkInDate;

    if (typeof p.nights !== "number" || !Number.isInteger(p.nights) || p.nights < 0 || p.nights > MAX_NIGHTS) {
      errors.nights = "errNights";
    } else if (checkInDate) {
      checkOutDate = addDays(checkInDate, p.nights);
    }

    if (!ID_TYPES.includes(p.idType as IdType)) {
      errors.idType = "errIdType";
    } else {
      idType = p.idType as IdType;
      const last4 = (p.idLast4 ?? "").toUpperCase();
      const ok = idType === "AADHAAR" ? /^\d{4}$/.test(last4) : /^[0-9A-Z]{4}$/.test(last4);
      if (!ok) errors.idNumber = idType === "AADHAAR" ? "errAadhaar" : "errIdNumber";
      else idNumberMasked = maskId(idType, last4);
    }

    if (p.vehicleType && VEHICLE_TYPES.includes(p.vehicleType as VehicleType)) {
      vehicleType = p.vehicleType as VehicleType;
      const num = cleanVehicleNumber(p.vehicleNumber ?? "");
      if (num.length > 15) errors.vehicleNumber = "errVehicleNumber";
      else vehicleNumber = num || null;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    entry: {
      name,
      mobile,
      city,
      men: p.men,
      women: p.women,
      children: p.children,
      totalPeople,
      wantsNashta: p.nashta,
      wantsBhojan: p.bhojan,
      wantsStay: p.stay,
      mealDate,
      mealPeople,
      checkInDate,
      checkOutDate,
      idType,
      idNumberMasked,
      vehicleType,
      vehicleNumber,
    },
  };
}

/** Server side: turn untrusted input into an EntryPayload, or null if it is malformed. */
export function parsePayload(input: unknown): EntryPayload | null {
  if (typeof input !== "object" || input === null) return null;
  const o = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  if (!isUuid(o.id)) return null;
  if (typeof o.nashta !== "boolean" || typeof o.bhojan !== "boolean" || typeof o.stay !== "boolean") return null;
  return {
    id: o.id.toLowerCase(),
    nashta: o.nashta,
    bhojan: o.bhojan,
    stay: o.stay,
    name: str(o.name) ?? "",
    mobile: str(o.mobile) ?? "",
    city: str(o.city) ?? "",
    men: num(o.men) ?? -1,
    women: num(o.women) ?? -1,
    children: num(o.children) ?? -1,
    mealDate: str(o.mealDate),
    mealPeople: num(o.mealPeople),
    checkInDate: str(o.checkInDate),
    nights: num(o.nights),
    idType: str(o.idType),
    idLast4: str(o.idLast4),
    vehicleType: str(o.vehicleType),
    vehicleNumber: str(o.vehicleNumber),
  };
}

// ---------- Display helpers ----------

/** An entry as the pages use it: plain values, DB dates turned into YYYY-MM-DD. */
export type EntryView = {
  id: string;
  tokenNo: number;
  createdAt: Date;
  name: string;
  mobile: string;
  city: string;
  men: number;
  women: number;
  children: number;
  totalPeople: number;
  wantsNashta: boolean;
  wantsBhojan: boolean;
  wantsStay: boolean;
  mealDate: string | null;
  mealPeople: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  idType: string | null;
  idNumberMasked: string | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  status: "ACTIVE" | "CANCELLED";
  cancelReason: string | null;
  cancelledAt: Date | null;
  enteredBy: "YATRI" | "STAFF";
  /** Language the form was filled in ("hi" | "en"). */
  lang: string;
  hasIdPhoto: boolean;
  idPhotoUrl: string | null;
};

export function formatToken(tokenNo: number): string {
  return String(tokenNo).padStart(4, "0");
}

export function sevaNames(e: Pick<EntryView, "wantsNashta" | "wantsBhojan" | "wantsStay">, t: Dict): string[] {
  const out: string[] = [];
  if (e.wantsNashta) out.push(t.nashta);
  if (e.wantsBhojan) out.push(t.bhojan);
  if (e.wantsStay) out.push(t.stay);
  return out;
}

export function idTypeLabel(idType: string | null, t: Dict): string {
  return idType && ID_TYPES.includes(idType as IdType) ? t[`id${idType as IdType}`] : "";
}

export function vehicleLabel(vehicleType: string | null, t: Dict): string {
  return vehicleType && VEHICLE_TYPES.includes(vehicleType as VehicleType) ? t[`veh${vehicleType as VehicleType}`] : t.vehNONE;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return daysBetween(checkIn, checkOut);
}
