import type { NextRequest } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/entry-rules";

/**
 * Staff / admin only: the ID photo of an entry. While it is still in the database it is served
 * from here; once the Google Sheet has saved it in Drive, this sends you to the Drive file.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/admin/id-photo/[id]">) {
  if (!(await getSessionRole())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });

  const entry = await prisma.entry.findUnique({
    where: { id: id.toLowerCase() },
    select: { idPhotoUrl: true, idPhoto: { select: { mime: true, data: true } } },
  });
  if (entry?.idPhoto) {
    return new Response(entry.idPhoto.data, {
      headers: { "Content-Type": entry.idPhoto.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
  if (entry?.idPhotoUrl?.startsWith("https://")) return Response.redirect(entry.idPhotoUrl, 302);
  return new Response("Not found", { status: 404 });
}
