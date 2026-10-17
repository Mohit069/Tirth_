import type { Metadata } from "next";
import { LoginScreen } from "@/components/login-page";
import { getDict } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.staffLogin };
}

export default async function StaffLoginPage() {
  const { lang } = await getDict();
  return <LoginScreen lang={lang} role="staff" />;
}
