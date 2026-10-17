import { redirect } from "next/navigation";
import { getSessionRole } from "@/lib/auth";
import { dict, type Lang } from "@/lib/i18n";
import { ShikharIcon } from "./icons";
import { LangToggle } from "./lang-toggle";
import { LoginForm } from "./login-form";

/** Shared screen for /staff/login and /admin/login. */
export async function LoginScreen({ lang, role }: { lang: Lang; role: "staff" | "admin" }) {
  const current = await getSessionRole();
  if (current === "admin" || (current === "staff" && role === "staff")) {
    redirect(role === "admin" ? "/admin" : "/staff");
  }
  const t = dict[lang];

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LangToggle lang={lang} />
        </div>
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_12px_30px_-18px_rgba(35,28,23,0.4)]">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand text-white">
              <ShikharIcon size={34} />
            </span>
            <h1 className="mt-3 text-[22px] font-bold">{role === "admin" ? t.adminLogin : t.staffLogin}</h1>
            <p className="mt-1 text-[13px] leading-snug text-muted">{t.trustName}</p>
          </div>
          <LoginForm lang={lang} role={role} />
        </div>
      </div>
    </main>
  );
}
