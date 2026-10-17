import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { AlertIcon, BedIcon, CupIcon, ShikharIcon, MealIcon, WhatsAppIcon } from "@/components/icons";
import { PrintButton } from "@/components/print-button";
import { AppHeader } from "@/components/site-chrome";
import { requireRole } from "@/lib/auth";
import { appUrl, trustWhatsAppDisplay } from "@/lib/config";
import { dict } from "@/lib/i18n";
import { getDict } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.printQr };
}

export default async function QrPage() {
  await requireRole("admin");
  const { lang, t } = await getDict();
  const hi = dict.hi;
  const en = dict.en;

  const configured = appUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? "http";
  const url = `${configured ?? `${proto}://${host}`}/`;

  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#231c17", light: "#ffffff" },
  });

  return (
    <>
      <AppHeader lang={lang} title={t.adminTitle} homeHref="/admin" logoutTo="admin">
        <AdminNav t={t} current="qr" />
      </AppHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-4 print:max-w-none print:p-0">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-muted">{t.qrHelp}</p>
          <PrintButton label={t.print} />
        </div>
        {!configured ? (
          <p className="no-print mb-4 flex items-start gap-2 rounded-xl bg-nashta-soft px-3 py-2 text-[14px] text-nashta">
            <AlertIcon size={18} className="mt-0.5 shrink-0" />
            {t.qrMissingUrl}
          </p>
        ) : null}

        {/* The poster: always Hindi first with English below, whatever the screen language. */}
        <article className="qr-poster mx-auto flex flex-col items-center overflow-hidden rounded-3xl border border-line bg-white text-center shadow-[0_12px_30px_-18px_rgba(35,28,23,0.4)] print:rounded-none print:border-0 print:shadow-none">
          <div className="w-full bg-brand px-6 py-5 text-white print:py-6">
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-2xl bg-white/15">
              <ShikharIcon size={36} />
            </div>
            <h1 className="text-[28px] font-bold leading-tight print:text-[34px]">{hi.trustName}</h1>
            <p className="mt-1 text-[15px] text-white/90 print:text-[17px]" lang="en">
              {en.trustName}
            </p>
          </div>

          <div className="px-6 pb-6 pt-7 print:pt-6">
            <p className="text-[30px] font-bold leading-tight text-brand-strong print:text-[38px]">{hi.qrScan}</p>
            <p className="mt-1 text-[17px] text-muted print:text-[20px]" lang="en">
              {en.qrScan}
            </p>

            <div
              className="mx-auto mt-6 w-[min(78vw,20rem)] rounded-2xl border-[6px] border-brand-soft p-3 print:w-[90mm] print:p-4 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              role="img"
              aria-label={url}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p className="tabular mt-3 break-all text-[14px] text-muted">{url}</p>

            <ol className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-3 print:mt-5 print:grid-cols-3">
              <Step n={1} hiText={hi.qrStep1} enText={en.qrStep1} />
              <Step n={2} hiText={hi.qrStep2} enText={en.qrStep2} />
              <Step n={3} hiText={hi.qrStep3} enText={en.qrStep3} />
            </ol>

            <div className="mt-6 flex items-center justify-center gap-4 text-muted print:mt-4" aria-hidden="true">
              <Seva icon={<CupIcon size={26} />} label={hi.nashta} tone="bg-nashta-soft text-nashta" />
              <Seva icon={<MealIcon size={26} />} label={hi.bhojan} tone="bg-bhojan-soft text-bhojan" />
              <Seva icon={<BedIcon size={26} />} label={hi.stay} tone="bg-stay-soft text-stay" />
            </div>
          </div>

          <div className="w-full border-t border-line px-6 py-4 text-[13px] leading-relaxed text-muted print:text-[14px]">
            <p>{hi.managedBy}</p>
            <p>{hi.address}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-ok">
              <WhatsAppIcon size={16} />
              WhatsApp: {trustWhatsAppDisplay()}
            </p>
          </div>
        </article>
      </main>
    </>
  );
}

function Step({ n, hiText, enText }: { n: number; hiText: string; enText: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-paper px-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[15px] font-bold text-white">{n}</span>
      <span>
        <span className="block text-[16px] font-bold leading-snug">{hiText}</span>
        <span className="block text-[13px] leading-snug text-muted" lang="en">
          {enText}
        </span>
      </span>
    </li>
  );
}

function Seva({ icon, label, tone }: { icon: ReactNode; label: string; tone: string }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className={`grid size-12 place-items-center rounded-full ${tone}`}>{icon}</span>
      <span className="text-[14px] font-semibold text-ink">{label}</span>
    </span>
  );
}
