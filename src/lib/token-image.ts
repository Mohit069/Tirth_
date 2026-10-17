import type { TokenCard } from "./token-card";
import { cardText, PHOTO_SCALE, planTokenPhoto } from "./token-paint";

/** Draws the token photo in the browser with the page's own font (share / save buttons). */
export async function renderTokenPng(card: TokenCard): Promise<Blob> {
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  await loadFonts(family, cardText(card));

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas is not available");
  const plan = planTokenPhoto(measure, family, (d) => new Path2D(d), card);

  const canvas = document.createElement("canvas");
  canvas.width = plan.width * PHOTO_SCALE;
  canvas.height = plan.height * PHOTO_SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.scale(PHOTO_SCALE, PHOTO_SCALE);
  plan.draw(ctx);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the token photo"))), "image/png"),
  );
}

/** Makes sure the page font (every weight used, Hindi and Latin) is loaded before drawing. */
async function loadFonts(family: string, sample: string) {
  if (!document.fonts) return;
  try {
    await Promise.all(([400, 500, 600, 700] as const).map((w) => document.fonts.load(`${w} 16px ${family}`, sample)));
  } catch {
    // Draw with whatever font the phone has; Hindi still shapes correctly.
  }
}
