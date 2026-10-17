import "server-only";
import { trustWhatsApp } from "./config";

/*
 * Sends WhatsApp messages through Meta's WhatsApp Business Platform (Cloud API).
 * Messages the business starts must use templates approved in WhatsApp Manager; the setup
 * steps and the exact template texts are in the README ("WhatsApp messages").
 *
 * WHATSAPP_API_URL only exists to point tests at a fake server.
 */

const GRAPH = (process.env.WHATSAPP_API_URL || "https://graph.facebook.com/v25.0").replace(/\/+$/, "");

export type WhatsAppConfig = {
  token: string;
  phoneNumberId: string;
  yatriTemplate: string;
  teamTemplate: string;
  /** The trust's representative number(s), with country code. */
  teamNumbers: string[];
  /** At most this many entries a day get WhatsApp messages (guards the bill against form spam). */
  dailyLimit: number;
};

export function whatsAppConfig(): WhatsAppConfig | null {
  const token = (process.env.WHATSAPP_TOKEN ?? "").trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim();
  if (!token || !phoneNumberId) return null;
  const limit = Number.parseInt(process.env.WHATSAPP_DAILY_LIMIT ?? "", 10);
  return {
    token,
    phoneNumberId,
    yatriTemplate: process.env.WHATSAPP_YATRI_TEMPLATE?.trim() || "yatri_token",
    teamTemplate: process.env.WHATSAPP_TEAM_TEMPLATE?.trim() || "yatri_entry_alert",
    teamNumbers: parseNumbers(process.env.WHATSAPP_TEAM_NUMBERS?.trim() || trustWhatsApp()),
    dailyLimit: Number.isFinite(limit) && limit > 0 ? limit : 2000,
  };
}

/** "92160 57565, 919876543210" -> ["919216057565", "919876543210"] (10 digits get India's 91). */
function parseNumbers(list: string): string[] {
  const out = list
    .split(/[,;]/)
    .map((n) => n.replace(/\D/g, ""))
    .map((n) => (n.length === 10 ? `91${n}` : n))
    .filter((n) => n.length >= 11 && n.length <= 15);
  return [...new Set(out)];
}

export class WhatsAppError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
  ) {
    super(message);
  }
}

async function graph<T>(cfg: WhatsAppConfig, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; error_data?: { details?: string } };
  };
  if (!res.ok) {
    const e = json.error;
    const code = typeof e?.code === "number" ? e.code : null;
    throw new WhatsAppError(`WhatsApp ${res.status}${code ? ` #${code}` : ""}: ${e?.error_data?.details ?? e?.message ?? res.statusText}`, code);
  }
  return json as T;
}

/** Uploads a PNG and returns its media id (valid for 30 days, reusable for several messages). */
export async function uploadImage(cfg: WhatsAppConfig, png: Uint8Array, filename: string): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "image/png");
  form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), filename);
  const res = await graph<{ id?: string }>(cfg, `${cfg.phoneNumberId}/media`, { method: "POST", body: form });
  if (!res.id) throw new WhatsAppError("WhatsApp photo upload returned no id", null);
  return res.id;
}

/** Sends an approved template with the token photo as its header. Returns WhatsApp's message id. */
export async function sendTemplate(
  cfg: WhatsAppConfig,
  msg: { to: string; template: string; lang: string; imageId: string; body: string[] },
): Promise<string> {
  const res = await graph<{ messages?: { id?: string }[] }>(cfg, `${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: msg.to,
      type: "template",
      template: {
        name: msg.template,
        language: { code: msg.lang },
        components: [
          { type: "header", parameters: [{ type: "image", image: { id: msg.imageId } }] },
          { type: "body", parameters: msg.body.map((text) => ({ type: "text", text: templateValue(text) })) },
        ],
      },
    }),
  });
  return res.messages?.[0]?.id ?? "";
}

/** WhatsApp rejects template values with new lines, tabs or runs of spaces, and empty values. */
function templateValue(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 250) || "-";
}

/** Meta error code: template not found in the requested language. */
export const TEMPLATE_LANGUAGE_MISSING = 132001;
