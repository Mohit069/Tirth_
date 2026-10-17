"use client";

import { PrinterIcon } from "./icons";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 text-[17px] font-bold text-white transition hover:bg-brand-strong active:scale-95"
    >
      <PrinterIcon size={21} />
      {label}
    </button>
  );
}
