"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-fetches the page every `seconds` (at most `times` times, if given), but not while a dialog
 * is open or the tab is hidden.
 */
export function AutoRefresh({ seconds = 30, times }: { seconds?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let left = times ?? Number.POSITIVE_INFINITY;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (document.querySelector("dialog[open]")) return;
      router.refresh();
      left -= 1;
      if (left <= 0) clearInterval(timer);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds, times]);
  return null;
}
