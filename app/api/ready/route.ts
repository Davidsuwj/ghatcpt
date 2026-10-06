import { db } from "@/db/raw";

// Readiness reports availability only; it never exposes records or connection settings.
export async function GET() {
  try {
    const result = await db().prepare("SELECT 1 AS connected").first<{ connected: number }>();
    if (result?.connected !== 1) throw new Error("Database unavailable");
    return Response.json({ ok: true, backend: "d1", connected: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ ok: false, backend: "d1", connected: false }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
