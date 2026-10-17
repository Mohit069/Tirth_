import Link from "next/link";
import { ShikharIcon } from "@/components/icons";
import { PublicHeader, SiteFooter } from "@/components/site-chrome";
import { getDict } from "@/lib/lang";

export default async function NotFound() {
  const { lang, t } = await getDict();
  return (
    <>
      <PublicHeader lang={lang} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
          <ShikharIcon size={38} />
        </span>
        <h1 className="mt-4 text-[24px] font-bold">{t.notFoundTitle}</h1>
        <p className="mt-2 text-[16px] text-muted">{t.tokenNotFoundHint}</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand px-6 text-[17px] font-bold text-white">
          {t.goHome}
        </Link>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
