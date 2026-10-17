"use client";

import { useEffect, useState } from "react";
import { dict } from "@/lib/i18n";
import type { TokenCard } from "@/lib/token-card";
import { renderTokenPng } from "@/lib/token-image";
import { DownloadIcon } from "./icons";

type Photo = { file: File; canShare: boolean };

/**
 * The coupon as a photo: a download button, and a share button on phones (the share sheet lets
 * the yatri send it to family or keep it). The photo is drawn as soon as the page opens because
 * Safari only allows the share sheet straight after a tap, not after a wait.
 */
export function TokenShare({ card, fileName }: { card: TokenCard; fileName: string }) {
  const t = dict[card.lang];
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keyed on the card's content, not the object: a page refresh hands over an equal new object.
  const cardJson = JSON.stringify(card);
  useEffect(() => {
    let live = true;
    renderTokenPng(JSON.parse(cardJson) as TokenCard).then(
      (blob) => {
        if (!live) return;
        const file = new File([blob], fileName, { type: "image/png" });
        const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
        setPhoto({ file, canShare });
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [cardJson, fileName]);

  function save(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setSaved(true);
  }

  function share(file: File) {
    navigator.share({ files: [file] }).catch((err: unknown) => {
      // Closing the share sheet is not an error; anything else falls back to a download.
      if (!(err instanceof DOMException && err.name === "AbortError")) save(file);
    });
  }

  const hint = failed ? t.photoFailed : !photo ? t.photoPreparing : saved ? t.photoSaved : null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => photo && save(photo.file)}
        disabled={!photo}
        aria-describedby="token-share-hint"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-ok/40 bg-card text-[17px] font-semibold text-ok transition hover:bg-ok-soft disabled:cursor-wait disabled:opacity-60"
      >
        <DownloadIcon size={20} />
        {t.downloadPhoto}
      </button>
      {photo?.canShare ? (
        <button
          type="button"
          onClick={() => share(photo.file)}
          className="mx-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-ok transition hover:bg-ok-soft"
        >
          {t.sharePhoto}
        </button>
      ) : null}
      <p id="token-share-hint" aria-live="polite" className="px-2 text-center text-[14px] leading-relaxed text-muted">
        {hint ? `${hint} ` : ""}
        {t.screenshotHint}
      </p>
    </div>
  );
}
