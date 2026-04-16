import { NextResponse } from "next/server";

import { saveOverride } from "@/lib/entities/loadEntities";

export const runtime = "nodejs";

type VerifyPayload = {
  name?: unknown;
  source_url?: unknown;
};

export async function POST(req: Request) {
  let payload: VerifyPayload = {};
  try {
    payload = (await req.json()) as VerifyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const sourceUrl = typeof payload.source_url === "string" ? payload.source_url.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Missing entity name" }, { status: 400 });
  }

  saveOverride(name, {
    verification_status: "verified",
    last_verified_at: new Date().toISOString(),
    source_url: sourceUrl,
    verification_result: "MANUAL_OVERRIDE"
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

