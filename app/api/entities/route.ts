import { NextResponse } from "next/server";

import { loadEntities } from "@/lib/entities/loadEntities";

export const runtime = "nodejs";

export async function GET() {
  try {
    const entities = loadEntities();
    return NextResponse.json(entities, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to load entities" }, { status: 500 });
  }
}

