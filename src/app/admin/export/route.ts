import type { NextRequest } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { istDate } from "@/lib/dates";
import { entryRow, type CellValue } from "@/lib/entry-columns";
import type { EntryView } from "@/lib/entry-rules";
import type { Dict } from "@/lib/i18n";
import { getDict } from "@/lib/lang";
import { exportBatches } from "@/lib/queries";
import { resolveRange } from "@/lib/ranges";

/** One CSV cell. Values that start like a formula are prefixed so Excel shows them as text. */
function cell(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(e: EntryView, t: Dict): string {
  return entryRow(e, t).map(cell).join(",");
}

export async function GET(request: NextRequest) {
  if ((await getSessionRole()) !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const range = resolveRange(
    { range: sp.get("range") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined },
    istDate(),
  );
  const { t } = await getDict();

  // Streamed in batches of 1,000 rows, so even a year of entries never sits in memory at once.
  const encoder = new TextEncoder();
  const batches = exportBatches(range.from, range.to);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // UTF-8 BOM so Excel shows Hindi text correctly.
      controller.enqueue(encoder.encode(`﻿${t.csvHeaders.map(cell).join(",")}\r\n`));
    },
    async pull(controller) {
      try {
        const next = await batches.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${next.value.map((e) => row(e, t)).join("\r\n")}\r\n`));
      } catch (err) {
        console.error("CSV export failed", err);
        controller.error(err);
      }
    },
    async cancel() {
      await batches.return(undefined);
    },
  });

  const filename = `bafna-tirth-entries_${range.from}_to_${range.to}.csv`;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
