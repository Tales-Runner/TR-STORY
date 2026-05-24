import { NextResponse } from "next/server";
import { fetchStoryList } from "@/lib/api";

export const revalidate = 1800;

export async function GET() {
  try {
    const list = await fetchStoryList();
    return NextResponse.json(list, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upstream error" },
      { status: 502 }
    );
  }
}
