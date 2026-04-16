import fs from "node:fs";

import { NextResponse } from "next/server";

import { VERIFICATION_REPORT_PATH } from "@/lib/paths";
import { readJsonFile } from "@/lib/storage/jsonFiles";
import type { VerificationReport } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!fs.existsSync(VERIFICATION_REPORT_PATH)) {
    return NextResponse.json({ error: "Verification report not found" }, { status: 404 });
  }
  const report = readJsonFile<VerificationReport | null>(VERIFICATION_REPORT_PATH, null);
  if (!report) {
    return NextResponse.json({ error: "Verification report not found" }, { status: 404 });
  }
  return NextResponse.json(report, { status: 200 });
}

