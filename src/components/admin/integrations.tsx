import type { Dict, Lang } from "@/lib/i18n";
import type { JobHealth } from "@/lib/jobs";
import { RetryJobsButton } from "./retry-jobs-button";

export type IntegrationState = {
  whatsApp: { on: boolean; team: string[] };
  sheet: { state: "on" | "off" | "invalid"; url: string | null };
};

/** 919216057565 -> "92160 57565" */
export function displayWhatsApp(number: string): string {
  const local = number.replace(/^91(?=\d{10}$)/, "");
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : `+${number}`;
}

/**
 * Whether the Google Sheet copy (and, if it was set up, automatic WhatsApp) is on, and anything
 * that failed to go out. WhatsApp is paid, so while it is off the card is only about the sheet.
 */
export function IntegrationsCard({ state, health, t, lang }: { state: IntegrationState; health: JobHealth; t: Dict; lang: Lang }) {
  const { whatsApp, sheet } = state;
  const problem = health.failed > 0 || health.waiting > 0;
  const anyOn = whatsApp.on || sheet.state === "on";
  return (
    <section className={`rounded-2xl border p-4 ${problem ? "border-danger/30 bg-danger-soft/50" : "border-line bg-card"}`}>
      <h2 className="text-[17px] font-bold">{whatsApp.on ? t.linksTitle : "Google Sheet"}</h2>
      <ul className="mt-2 space-y-1.5 text-[15px]">
        {whatsApp.on ? (
          <li className="flex flex-wrap items-center gap-x-2">
            <Dot on />
            <span className="font-semibold">{t.waOn}</span>
            {whatsApp.team.length ? (
              <span className="tabular text-muted">· {t.waTeam(whatsApp.team.map(displayWhatsApp).join(", "))}</span>
            ) : null}
          </li>
        ) : null}
        <li className="flex flex-wrap items-center gap-x-2">
          <Dot on={sheet.state === "on"} />
          <span className="font-semibold">{sheet.state === "on" ? t.sheetOn : sheet.state === "invalid" ? t.sheetInvalid : t.sheetOff}</span>
          {sheet.url ? (
            <a href={sheet.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-ok underline underline-offset-2">
              {t.openSheet}
            </a>
          ) : null}
        </li>
      </ul>
      {sheet.state !== "on" ? <p className="mt-2 text-[13px] text-muted">{t.setupHint}</p> : null}

      {problem ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-3 py-2.5">
          <p className="text-[15px] font-semibold text-danger">
            {[health.failed ? t.jobsFailed(health.failed) : null, health.waiting ? t.jobsWaiting(health.waiting) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <RetryJobsButton lang={lang} />
        </div>
      ) : anyOn ? (
        <p className="mt-2 text-[14px] font-medium text-ok">{t.jobsAllSent}</p>
      ) : null}
    </section>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${on ? "bg-ok" : "bg-line-strong"}`} />;
}
