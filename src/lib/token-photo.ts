import "server-only";
import path from "node:path";
import { createCanvas, GlobalFonts, Path2D } from "@napi-rs/canvas";
import type { TokenCard } from "./token-card";
import { PHOTO_SCALE, planTokenPhoto } from "./token-paint";

const FAMILY = "Noto Sans Devanagari";
let fontsLoaded = false;

/** Servers have no Hindi fonts, so the app ships its own in assets/fonts (see next.config.ts). */
function loadFonts() {
  if (fontsLoaded) return;
  for (const weight of [400, 500, 600, 700]) {
    const file = path.join(process.cwd(), "assets", "fonts", `NotoSansDevanagari-${weight}.ttf`);
    if (!GlobalFonts.registerFromPath(file, FAMILY)) throw new Error(`Font file missing: ${file}`);
  }
  fontsLoaded = true;
}

/** Draws the token photo on the server (sent on WhatsApp). Same layout as the page's photo. */
export function renderTokenPhoto(card: TokenCard): Buffer {
  loadFonts();
  // @napi-rs/canvas implements the browser canvas API, so the shared painter runs unchanged.
  const measure = createCanvas(1, 1).getContext("2d") as unknown as CanvasRenderingContext2D;
  const plan = planTokenPhoto(measure, `"${FAMILY}"`, (d) => new Path2D(d) as unknown as globalThis.Path2D, card);

  const canvas = createCanvas(plan.width * PHOTO_SCALE, plan.height * PHOTO_SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(PHOTO_SCALE, PHOTO_SCALE);
  plan.draw(ctx as unknown as CanvasRenderingContext2D);
  return canvas.toBuffer("image/png");
}
