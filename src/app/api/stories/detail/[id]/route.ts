import { NextResponse } from "next/server";
import { fetchStoryDetail } from "@/lib/api";

export const revalidate = 1800;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    const detail = await fetchStoryDetail(n);
    if (!detail) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upstream error" },
      { status: 502 }
    );
  }
}
