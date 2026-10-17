import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import type { JobStatus } from "@/generated/prisma/client";
import { SevaBadges } from "@/components/entry-bits";
import { AlertIcon, ArrowLeftIcon, CheckIcon, Icon, PlusIcon, TicketIcon, WhatsAppIcon } from "@/components/icons";
import { PublicHeader, SiteFooter } from "@/components/site-chrome";
import { AutoRefresh } from "@/components/staff/auto-refresh";
import { TokenShare } from "@/components/token-share";
import { getSessionRole } from "@/lib/auth";
import { trustWhatsApp, trustWhatsAppDisplay } from "@/lib/config";
import { formatToken, isUuid } from "@/lib/entry-rules";
import { otherLang, type Dict } from "@/lib/i18n";
import { yatriMessageStatus } from "@/lib/jobs";
import { getDict } from "@/lib/lang";
import { getEntry } from "@/lib/queries";
import { tokenCard, type CardRun } from "@/lib/token-card";
import { trustMessage, whatsAppLink } from "@/lib/trust-message";
import { whatsAppConfig } from "@/lib/whatsapp";

const loadEntry = cache(async (id: string) => (isUuid(id) ? getEntry(id.toLowerCase()) : null));

export async function generateMetadata({ params }: PageProps<"/token/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [{ t }, entry] = await Promise.all([getDict(), loadEntry(id)]);
  return { title: entry ? `${t.token} #${formatToken(entry.tokenNo)}` : t.tokenNotFound };
}

export default async function TokenPage({ params }: PageProps<"/token/[id]">) {
  const { id } = await params;
  const [{ lang, t }, entry, role] = await Promise.all([getDict(), loadEntry(id), getSessionRole()]);
  if (!entry) notFound();

  const altLang = otherLang(lang);
  const card = tokenCard(entry, lang);
  const cancelled = entry.status === "CANCELLED";
  const waStatus = cancelled ? null : await yatriMessageStatus(entry.id, entry.mobile);
  const waSending = waStatus === "PENDING" || waStatus === "RUNNING";
  // Free way to reach the trust: the yatri's own WhatsApp sends the details (one tap on Send).
  // Not needed when the paid automatic WhatsApp is switched on.
  const trustHref = cancelled || whatsAppConfig() ? null : whatsAppLink(trustWhatsApp(), trustMessage(entry, t));

  return (
    <>
      <PublicHeader lang={lang} />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 pb-10 pt-5">
        {role ? (
          <Link href="/staff" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-stay">
            <ArrowLeftIcon size={18} />
            {t.backToStaff}
          </Link>
        ) : null}

        {cancelled ? (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-danger">
            <AlertIcon size={22} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-[17px] font-bold">{t.cancelledBanner}</p>
              {entry.cancelReason ? (
                <p className="text-[15px]">
                  {t.reason}: {entry.cancelReason}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <article
          className={`overflow-hidden rounded-3xl border border-line bg-card shadow-[0_12px_30px_-18px_rgba(35,28,23,0.45)] ${cancelled ? "opacity-75" : ""}`}
          aria-label={`${t.token} #${card.token}`}
        >
          <div className={`px-5 pb-5 pt-5 text-center text-white ${cancelled ? "bg-[#7a6a5e]" : "bg-brand"}`}>
            <p className="text-[15px] font-semibold tracking-wide text-white/90">
              {card.tokenLabel} <span lang={altLang}>· {card.tokenLabelAlt}</span>
            </p>
            <p className={`tabular mt-1 text-[68px] font-bold leading-none tracking-tight ${cancelled ? "line-through decoration-4" : ""}`}>
              #{card.token}
            </p>
            <p className="mt-2 text-[14px] text-white/85">{card.createdAt}</p>
          </div>

          <div className="ticket-cut relative h-6 bg-card" aria-hidden="true">
            <div className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-line-strong" />
          </div>

          <dl className="space-y-4 px-5 pb-6 pt-1">
            {card.rows.map((row) => (
              <Row key={row.label} label={row.label} icon={row.kind === "text" && row.icon ? <Icon name={row.icon} size={18} /> : null}>
                {row.kind === "seva" ? <SevaBadges entry={entry} t={t} /> : <Runs runs={row.runs} large={row.large} />}
              </Row>
            ))}
          </dl>
        </article>

        {waStatus ? <WhatsAppStatus status={waStatus} mobile={`XXXXXX${entry.mobile.slice(-4)}`} t={t} /> : null}
        {/* While the message is on its way, check again every few seconds (for about half a minute). */}
        {waSending ? <AutoRefresh seconds={3} times={10} /> : null}

        {!cancelled ? (
          <>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft px-4 py-3.5">
              <TicketIcon size={28} className="shrink-0 text-brand" />
              <p className="text-[18px] font-bold leading-snug text-brand-strong">{card.showAtCounter}</p>
            </div>

            {trustHref ? (
              <div className="space-y-2">
                <a
                  href={trustHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl bg-ok text-[20px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(27,127,59,0.65)] transition hover:bg-ok-strong active:scale-[0.99]"
                >
                  <WhatsAppIcon size={26} />
                  {t.sendWhatsApp}
                </a>
                <p className="px-2 text-center text-[14px] leading-relaxed text-muted">{t.whatsAppHint(trustWhatsAppDisplay())}</p>
              </div>
            ) : null}

            <TokenShare card={card} fileName={`bafna-tirth-token-${card.token}.png`} />
          </>
        ) : null}

        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-line-strong bg-card text-[17px] font-semibold text-ink transition hover:bg-brand-soft"
        >
          <PlusIcon size={20} />
          {t.newEntry}
        </Link>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}

/** Whether the token reached the yatri's own WhatsApp (shown only when WhatsApp is set up). */
function WhatsAppStatus({ status, mobile, t }: { status: JobStatus; mobile: string; t: Dict }) {
  const sent = status === "DONE";
  const sending = status === "PENDING" || status === "RUNNING";
  return (
    <p
      role="status"
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-semibold leading-snug ${
        sent ? "bg-ok-soft text-ok-strong" : "border border-line bg-card text-muted"
      }`}
    >
      {sent ? <CheckIcon size={20} className="mt-0.5 shrink-0" /> : <WhatsAppIcon size={20} className="mt-0.5 shrink-0" />}
      <span>{sent ? t.waSent(mobile) : sending ? t.waSending(mobile) : t.waNotSent}</span>
    </p>
  );
}

function Row({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 max-[380px]:grid-cols-1 max-[380px]:gap-0.5">
      <dt className="flex items-center gap-1.5 text-[14px] font-medium text-muted">
        {icon ? <span className="translate-y-px">{icon}</span> : null}
        {label}
      </dt>
      <dd className="text-[17px] leading-snug">{children}</dd>
    </div>
  );
}

const RUN_CLASS: Record<NonNullable<CardRun["style"]>, string> = {
  strong: "font-bold",
  semi: "font-semibold",
  muted: "text-muted",
};

function Runs({ runs, large }: { runs: CardRun[]; large?: boolean }) {
  return (
    <span className={large ? "text-[20px]" : undefined}>
      {runs.map((run, i) => (
        <span key={i} className={run.style ? RUN_CLASS[run.style] : undefined}>
          {run.text}
        </span>
      ))}
    </span>
  );
}
