import "server-only";

/** Trust WhatsApp number with country code, digits only (e.g. 919216057565). */
export function trustWhatsApp(): string {
  const digits = (process.env.TRUST_WHATSAPP ?? "").replace(/\D/g, "");
  return digits || "919216057565";
}

/** 919216057565 -> "92160 57565" */
export function trustWhatsAppDisplay(): string {
  const local = trustWhatsApp().replace(/^91(?=\d{10}$)/, "");
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : local;
}

/** Public address of the app (for the printed QR code), without a trailing slash. */
export function appUrl(): string | null {
  const url = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");
  return url || null;
}
