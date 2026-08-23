import { NextResponse } from "next/server";
import { buildDashboard } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await buildDashboard();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
