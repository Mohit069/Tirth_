"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** URL-driven modal: closing it goes to `closeHref` (the same page without ?entry=). */
export function Modal({ title, closeHref, closeLabel, children }: { title: string; closeHref: string; closeLabel: string; children: ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.replace(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [router, closeHref]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <Link href={closeHref} replace scroll={false} aria-label={closeLabel} className="absolute inset-0 bg-ink/55" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card shadow-2xl outline-none sm:rounded-3xl"
      >
        {children}
      </div>
    </div>
  );
}
