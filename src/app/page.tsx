import { PublicHeader, SiteFooter } from "@/components/site-chrome";
import { YatriForm } from "@/components/yatri-form";
import { getSessionRole } from "@/lib/auth";
import { istDate } from "@/lib/dates";
import { getDict } from "@/lib/lang";

export default async function HomePage() {
  const { lang } = await getDict();
  const role = await getSessionRole();

  return (
    <>
      <PublicHeader lang={lang} />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-5">
        <YatriForm lang={lang} today={istDate()} isStaff={role !== null} />
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
