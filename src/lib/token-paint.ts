import { ICON_PATHS, ICON_STROKE, type IconName } from "@/components/icon-paths";
import type { CardRow, CardRun, Seva, TokenCard } from "./token-card";

/*
 * Lays out and draws the token card on a 2D canvas. Used in the browser (share / save buttons)
 * and on the server (the photo sent on WhatsApp), so both photos are identical. Both run a real
 * text engine, so Hindi matras, half letters and conjuncts come out right. The layout mirrors
 * the token page.
 */

/** Colours from globals.css (@theme). */
const C = {
  paper: "#fbf6ee",
  card: "#ffffff",
  ink: "#231c17",
  muted: "#6b5d52",
  line: "#ebe1d4",
  lineStrong: "#d6c6b3",
  brand: "#b4410e",
  brandStrong: "#8e3108",
  brandSoft: "#fdf1e7",
  brandTint: "#f8dcc6",
  white: "#ffffff",
};

const SEVA: Record<Seva, { fg: string; bg: string; icon: IconName }> = {
  nashta: { fg: "#9a4d06", bg: "#fdf0d5", icon: "cup" },
  bhojan: { fg: "#17773a", bg: "#e3f5e8", icon: "meal" },
  stay: { fg: "#2546b0", bg: "#e5ebfb", icon: "bed" },
};

// Layout in CSS pixels. The PNG is drawn at 2× (960 px wide): sharp on phones, light for WhatsApp.
const WIDTH = 480;
export const PHOTO_SCALE = 2;
const PAD = 20;
const CARD_X = PAD;
const CARD_W = WIDTH - PAD * 2;
const CARD_R = 24;
const INSET = 22;
const LABEL_W = 112;
const VALUE_X = CARD_X + INSET + LABEL_W + 12;
const VALUE_W = CARD_X + CARD_W - INSET - VALUE_X;
const CUT_H = 24;
const ROW_GAP = 16;
const LEADING = 1.4;

type Weight = 400 | 500 | 600 | 700;
type Style = { weight: Weight; size: number; color: string };
type Span = Style & { text: string };
type Piece = Span & { width: number };
type Line = { pieces: Piece[]; width: number; size: number };
type Block = { height: number; draw: (top: number) => void };

/** Lines break only at ordinary spaces; no-break spaces (U+00A0) keep words together. */
const BREAK = /([ \t\r\n]+)/;
const isBreak = (text: string) => /^[ \t\r\n]*$/.test(text);

const LABEL: Style = { weight: 500, size: 15, color: C.muted };
const VALUE: Style = { weight: 400, size: 18, color: C.ink };
const RUN: Record<NonNullable<CardRun["style"]> | "plain", Pick<Style, "weight" | "color">> = {
  plain: { weight: 400, color: C.ink },
  strong: { weight: 700, color: C.ink },
  semi: { weight: 600, color: C.ink },
  muted: { weight: 400, color: C.muted },
};

export type TokenPhotoPlan = {
  /** Size in CSS pixels; the canvas is PHOTO_SCALE times larger. */
  width: number;
  height: number;
  /** Draws the photo on a context that is already scaled by PHOTO_SCALE. */
  draw: (ctx: CanvasRenderingContext2D) => void;
};

/**
 * Measures the card with `measure` (any 2D context; fonts must be loaded), then returns the
 * photo size and a function that draws it. `family` is the CSS font-family list to use.
 */
export function planTokenPhoto(
  measure: CanvasRenderingContext2D,
  family: string,
  makePath: (d: string) => Path2D,
  card: TokenCard,
): TokenPhotoPlan {
  const pen = new Pen(measure, family, makePath);
  const trust = trustBlock(pen, card);
  const band = bandBlock(pen, card);
  const rows = rowsBlock(pen, card.rows);
  const note = noteBlock(pen, card.showAtCounter);
  const cardTop = PAD + trust.height + 18;
  const cardH = band.height + CUT_H + rows.height;
  const noteTop = cardTop + cardH + 16;
  const height = Math.ceil(noteTop + note.height + PAD);

  return {
    width: WIDTH,
    height,
    draw(ctx) {
      pen.ctx = ctx;
      ctx.fillStyle = C.paper;
      ctx.fillRect(0, 0, WIDTH, height);
      trust.draw(PAD);
      drawCard(pen, cardTop, cardH, band, rows);
      note.draw(noteTop);
    },
  };
}

/** Every piece of text on the card, so a caller can load the fonts it needs before drawing. */
export function cardText(card: TokenCard): string {
  return [
    card.trustName,
    card.trustNameAlt,
    card.tokenLabel,
    card.tokenLabelAlt,
    card.createdAt,
    card.showAtCounter,
    ...card.rows.flatMap((row) => [row.label, ...(row.kind === "seva" ? row.sevas.map((s) => s.label) : row.runs.map((r) => r.text))]),
    `#${card.token}`,
  ].join(" ");
}

class Pen {
  constructor(
    /** Measuring context while laying out; swapped for the real canvas when drawing. */
    public ctx: CanvasRenderingContext2D,
    private readonly family: string,
    private readonly makePath: (d: string) => Path2D,
  ) {}

  private font(weight: Weight, size: number) {
    this.ctx.font = `${weight} ${size}px ${this.family}`;
  }

  width(text: string, s: Style): number {
    this.font(s.weight, s.size);
    return this.ctx.measureText(text).width;
  }

  /** Where the baseline sits inside a line box of height `lh`, the way CSS places text. */
  baseline(size: number, lh: number): number {
    this.font(400, size);
    const m = this.ctx.measureText("अHg");
    const ascent = m.fontBoundingBoxAscent || size * 1.05;
    const descent = m.fontBoundingBoxDescent || size * 0.45;
    return (lh - ascent - descent) / 2 + ascent;
  }

  fill(text: string, x: number, y: number, s: Style, alpha = 1) {
    this.font(s.weight, s.size);
    this.ctx.fillStyle = s.color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillText(text, x, y);
    this.ctx.globalAlpha = 1;
  }

  /** The big token number: centred, slightly tightened like `tracking-tight` on the page. */
  number(text: string, cx: number, y: number, s: Style) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-0.025 * s.size}px`;
    this.fill(text, cx, y, s);
    ctx.restore();
  }

  icon(name: IconName, x: number, y: number, size: number, color: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = ICON_STROKE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of ICON_PATHS[name]) ctx.stroke(this.makePath(d));
    ctx.restore();
  }

  box(x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: { color: string; width: number; dash?: number[] }) {
    const ctx = this.ctx;
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.setLineDash(stroke.dash ?? []);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Word-wraps spans into lines no wider than `max`. A word longer than a line is split between letters. */
  wrap(spans: Span[], max: number): Line[] {
    const lines: Line[] = [];
    let pieces: Piece[] = [];
    let width = 0;
    const push = (span: Span, text: string) => {
      const w = this.width(text, span);
      pieces.push({ ...span, text, width: w });
      width += w;
    };
    const flush = () => {
      while (pieces.length && isBreak(pieces[pieces.length - 1].text)) width -= pieces.pop()!.width;
      if (pieces.length) lines.push({ pieces, width, size: Math.max(...pieces.map((p) => p.size)) });
      pieces = [];
      width = 0;
    };
    for (const span of spans) {
      for (const word of span.text.split(BREAK)) {
        if (!word) continue;
        if (isBreak(word)) {
          if (pieces.length) push(span, " ");
          continue;
        }
        if (pieces.length && width + this.width(word, span) > max) flush();
        if (this.width(word, span) <= max) {
          push(span, word);
          continue;
        }
        let chunk = "";
        for (const g of graphemes(word)) {
          if (chunk && this.width(chunk + g, span) > max) {
            push(span, chunk);
            flush();
            chunk = "";
          }
          chunk += g;
        }
        if (chunk) push(span, chunk);
      }
    }
    flush();
    return lines;
  }

  /** Draws wrapped lines starting at `top`; returns the height used. */
  lines(lines: Line[], x: number, top: number, align: "left" | "center" = "left", alpha = 1): number {
    let y = top;
    for (const line of lines) {
      const lh = line.size * LEADING;
      const base = y + this.baseline(line.size, lh);
      let cx = align === "center" ? x - line.width / 2 : x;
      for (const piece of line.pieces) {
        this.fill(piece.text, cx, base, piece, alpha);
        cx += piece.width;
      }
      y += lh;
    }
    return y - top;
  }
}

function linesHeight(lines: Line[]): number {
  return lines.reduce((h, line) => h + line.size * LEADING, 0);
}

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Logo and trust name above the card, so a forwarded photo still says where it is from. */
function trustBlock(pen: Pen, card: TokenCard): Block {
  const logo = 48;
  const textX = PAD + logo + 12;
  const textW = WIDTH - PAD - textX;
  const name = pen.wrap([{ text: card.trustName, weight: 700, size: 18, color: C.ink }], textW);
  const alt = pen.wrap([{ text: card.trustNameAlt, weight: 400, size: 12, color: C.muted }], textW);
  const textH = linesHeight(name) + linesHeight(alt);
  const height = Math.max(logo, textH);
  return {
    height,
    draw(top) {
      const logoTop = top + (height - logo) / 2;
      pen.box(PAD, logoTop, logo, logo, 16, C.brandSoft, { color: C.brandTint, width: 1 });
      pen.icon("shikhar", PAD + 9, logoTop + 9, 30, C.brand);
      const y = top + (height - textH) / 2;
      pen.lines(alt, textX, y + pen.lines(name, textX, y));
    },
  };
}

/** The saffron band: "टोकन · Token", the big number and the date. */
function bandBlock(pen: Pen, card: TokenCard): Block {
  const inner = CARD_W - 40;
  const label = pen.wrap([{ text: `${card.tokenLabel} · ${card.tokenLabelAlt}`, weight: 600, size: 15, color: C.white }], inner);
  const date = pen.wrap([{ text: card.createdAt, weight: 400, size: 14, color: C.white }], inner);
  const number: Style = { weight: 700, size: 72, color: C.white };
  const height = 20 + linesHeight(label) + 4 + number.size + 10 + linesHeight(date) + 20;
  return {
    height,
    draw(top) {
      const cx = CARD_X + CARD_W / 2;
      let y = top + 20;
      y += pen.lines(label, cx, y, "center", 0.9) + 4;
      pen.number(`#${card.token}`, cx, y + pen.baseline(number.size, number.size), number);
      y += number.size + 10;
      pen.lines(date, cx, y, "center", 0.85);
    },
  };
}

function rowsBlock(pen: Pen, rows: CardRow[]): Block {
  const laid = rows.map((row) => rowBlock(pen, row));
  const height = 4 + laid.reduce((h, r) => h + r.height, 0) + ROW_GAP * Math.max(0, laid.length - 1) + 24;
  return {
    height,
    draw(top) {
      let y = top + 4;
      for (const row of laid) {
        row.draw(y);
        y += row.height + ROW_GAP;
      }
    },
  };
}

/** One label/value row. Like the page's grid, the label and value share their first baseline. */
function rowBlock(pen: Pen, row: CardRow): Block {
  const iconSize = 18;
  const hasIcon = row.kind === "text" && !!row.icon;
  const labelX = CARD_X + INSET + (hasIcon ? iconSize + 6 : 0);
  const labelLines = pen.wrap([{ ...LABEL, text: row.label }], CARD_X + INSET + LABEL_W - labelX);
  const labelLh = LABEL.size * LEADING;
  const labelBase = pen.baseline(LABEL.size, labelLh);

  const value = row.kind === "seva" ? sevaBadges(pen, row.sevas) : textValue(pen, row);
  const base = Math.max(value.firstBaseline, labelBase);
  const valueTop = base - value.firstBaseline;
  const labelTop = base - labelBase;
  const height = Math.max(valueTop + value.height, labelTop + linesHeight(labelLines));

  return {
    height,
    draw(top) {
      if (row.kind === "text" && row.icon) {
        pen.icon(row.icon, CARD_X + INSET, top + labelTop + (labelLh - iconSize) / 2 + 1, iconSize, C.muted);
      }
      pen.lines(labelLines, labelX, top + labelTop);
      value.draw(top + valueTop);
    },
  };
}

type Value = Block & { firstBaseline: number };

function textValue(pen: Pen, row: Extract<CardRow, { kind: "text" }>): Value {
  const size = row.large ? 22 : VALUE.size;
  const lines = pen.wrap(
    row.runs.map((run) => ({ text: run.text, size, ...RUN[run.style ?? "plain"] })),
    VALUE_W,
  );
  const first = lines[0]?.size ?? size;
  return {
    height: linesHeight(lines),
    firstBaseline: pen.baseline(first, first * LEADING),
    draw(top) {
      pen.lines(lines, VALUE_X, top);
    },
  };
}

/** Seva pills (icon + name), wrapping onto more lines if needed. */
function sevaBadges(pen: Pen, sevas: Extract<CardRow, { kind: "seva" }>["sevas"]): Value {
  const h = 30;
  const padX = 11;
  const icon = 16;
  const gap = 7;
  let x = 0;
  let y = 0;
  const pills = sevas.map((seva) => {
    const style: Style = { weight: 600, size: 14, color: SEVA[seva.key].fg };
    const w = padX * 2 + icon + 5 + pen.width(seva.label, style);
    if (x > 0 && x + w > VALUE_W) {
      x = 0;
      y += h + gap;
    }
    const pill = { ...seva, style, w, x, y };
    x += w + gap;
    return pill;
  });
  const textBase = pen.baseline(14, h);
  return {
    height: pills.length ? y + h : 0,
    firstBaseline: textBase,
    draw(top) {
      for (const p of pills) {
        const left = VALUE_X + p.x;
        const pillTop = top + p.y;
        pen.box(left, pillTop, p.w, h, h / 2, SEVA[p.key].bg);
        pen.icon(SEVA[p.key].icon, left + padX, pillTop + (h - icon) / 2, icon, SEVA[p.key].fg);
        pen.fill(p.label, left + padX + icon + 5, pillTop + textBase, p.style);
      }
    },
  };
}

/** White card with shadow, saffron band, ticket notches and dashed tear line. */
function drawCard(pen: Pen, top: number, height: number, band: Block, rows: Block) {
  const ctx = pen.ctx;
  ctx.save();
  ctx.shadowColor = "rgba(35, 28, 23, 0.16)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  pen.box(CARD_X, top, CARD_W, height, CARD_R, C.card);
  ctx.restore();

  const cutY = top + band.height + CUT_H / 2;
  ctx.save();
  roundRectPath(ctx, CARD_X, top, CARD_W, height, CARD_R);
  ctx.clip();
  ctx.fillStyle = C.brand;
  ctx.fillRect(CARD_X, top, CARD_W, band.height);
  ctx.fillStyle = C.paper;
  for (const x of [CARD_X, CARD_X + CARD_W]) {
    ctx.beginPath();
    ctx.arc(x, cutY, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  pen.box(CARD_X + 0.5, top + 0.5, CARD_W - 1, height - 1, CARD_R - 0.5, undefined, { color: C.line, width: 1 });
  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = C.lineStrong;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CARD_X + 24, cutY);
  ctx.lineTo(CARD_X + CARD_W - 24, cutY);
  ctx.stroke();
  ctx.restore();

  band.draw(top);
  rows.draw(top + band.height + CUT_H);
}

/** "Please show this token at the counter" box under the card, as on the page. */
function noteBlock(pen: Pen, text: string): Block {
  const icon = 28;
  const padX = 16;
  const padY = 14;
  const textX = PAD + padX + icon + 12;
  const lines = pen.wrap([{ text, weight: 700, size: 18, color: C.brandStrong }], WIDTH - PAD - padX - textX);
  const textH = linesHeight(lines);
  const inner = Math.max(icon, textH);
  const height = padY * 2 + inner;
  return {
    height,
    draw(top) {
      pen.box(PAD + 1, top + 1, CARD_W - 2, height - 2, 16, C.brandSoft, { color: "rgba(180, 65, 14, 0.4)", width: 2, dash: [7, 5] });
      pen.icon("ticket", PAD + padX, top + padY + (inner - icon) / 2, icon, C.brand);
      pen.lines(lines, textX, top + padY + (inner - textH) / 2);
    },
  };
}
