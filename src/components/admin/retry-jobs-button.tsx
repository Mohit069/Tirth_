"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { retryJobs } from "@/app/actions/jobs";
import { dict, type Lang } from "@/lib/i18n";

type State = { ok: boolean; count: number } | null;

/** Starts the retry, says so, and refreshes the page once the messages have had time to go out. */
export function RetryJobsButton({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const router = useRouter();
  const [state, action, pending] = useActionState<State>(() => retryJobs(), null);

  useEffect(() => {
    if (!state?.ok) return;
    const timer = setTimeout(() => router.refresh(), 5000);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-[15px] font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {t.retryNow}
      </button>
      {state?.ok ? (
        <span role="status" className="text-[13px] text-muted">
          {t.retrying(state.count)}
        </span>
      ) : null}
    </form>
  );
}
