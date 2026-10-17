"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { dict, type Lang } from "@/lib/i18n";
import { AlertIcon } from "./icons";

export function LoginForm({ lang, role }: { lang: Lang; role: "staff" | "admin" }) {
  const t = dict[lang];
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, { error: null });
  const isPin = role === "staff";

  const message =
    state.error === "wrong"
      ? isPin
        ? t.wrongPin
        : t.wrongPassword
      : state.error === "tooMany"
        ? t.tooManyAttempts
        : state.error === "notConfigured"
          ? t.notConfigured
          : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <label className="block">
        <span className="text-[16px] font-semibold">{isPin ? t.pin : t.password}</span>
        <input
          name="secret"
          type="password"
          inputMode={isPin ? "numeric" : "text"}
          autoComplete="current-password"
          autoFocus
          required
          className={`mt-2 h-[54px] w-full rounded-xl border-2 bg-card px-4 text-center text-[22px] tracking-[0.3em] outline-none transition focus:border-brand ${
            message ? "border-danger" : "border-line-strong"
          }`}
        />
      </label>
      {message ? (
        <p role="alert" className="flex items-center gap-1.5 text-[15px] font-medium text-danger">
          <AlertIcon size={18} />
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-[54px] w-full rounded-xl bg-brand text-[18px] font-bold text-white transition hover:bg-brand-strong active:scale-[0.99] disabled:opacity-70"
      >
        {pending ? t.loggingIn : t.login}
      </button>
    </form>
  );
}
