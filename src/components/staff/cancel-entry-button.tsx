"use client";

import { useRef, useState, useTransition } from "react";
import { cancelEntry } from "@/app/actions/entry";
import { dict, type Lang } from "@/lib/i18n";
import { AlertIcon, CloseIcon } from "../icons";

export function CancelEntryButton({ lang, entryId, token }: { lang: Lang; entryId: string; token: string }) {
  const t = dict[lang];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function confirm() {
    if (reason.trim().length < 2) {
      setError(t.errReason);
      return;
    }
    startTransition(async () => {
      try {
        const res = await cancelEntry(entryId, reason);
        if (res.ok) {
          close();
          setReason("");
        } else {
          setError(res.error === "reason" ? t.errReason : t.cancelFailed);
        }
      } catch {
        setError(t.cancelFailed);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="h-10 rounded-xl border-2 border-danger/25 bg-card px-4 text-[15px] font-semibold text-danger transition hover:bg-danger-soft active:scale-95"
      >
        {t.cancelEntry}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={`cancel-title-${entryId}`}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border border-line bg-card p-0 text-ink shadow-2xl"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="space-y-4 p-5"
        >
          <div className="flex items-start gap-3">
            <h2 id={`cancel-title-${entryId}`} className="flex-1 text-[20px] font-bold leading-snug">
              {t.cancelTitle(token)}
            </h2>
            <button type="button" onClick={close} aria-label={t.close} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-brand-soft">
              <CloseIcon size={20} />
            </button>
          </div>
          <label className="block">
            <span className="text-[15px] font-semibold">{t.cancelReason}</span>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.currentTarget.value);
                setError(null);
              }}
              rows={3}
              maxLength={200}
              placeholder={t.cancelReasonPlaceholder}
              className={`mt-2 w-full resize-none rounded-xl border-2 bg-card px-3.5 py-3 text-[16px] outline-none transition focus:border-brand ${
                error ? "border-danger" : "border-line-strong"
              }`}
            />
          </label>
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-danger">
              <AlertIcon size={17} />
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={close} className="h-12 rounded-xl border-2 border-line-strong bg-card text-[16px] font-semibold">
              {t.goBack}
            </button>
            <button type="submit" disabled={pending} className="h-12 rounded-xl bg-danger text-[16px] font-bold text-white disabled:opacity-70">
              {t.confirmCancel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
