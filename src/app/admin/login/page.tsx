import type { Metadata } from "next";
import { LoginScreen } from "@/components/login-page";
import { getDict } from "@/lib/lang";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.adminLogin };
}

export default async function AdminLoginPage() {
  const { lang } = await getDict();
  return <LoginScreen lang={lang} role="admin" />;
}
