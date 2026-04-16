import fs from "node:fs";
import vm from "node:vm";

import {
  AVAILABILITY_AUDIT_PATH,
  ENTITIES_JS_PATH,
  GLOBAL_VC_WEBSITES_PATH,
  INDIA_VC_WEBSITES_PATH,
  OVERRIDES_PATH,
  VERIFICATION_REPORT_PATH
} from "@/lib/paths";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonFiles";
import type {
  AvailabilityAudit,
  AvailabilityAuditRow,
  AvailabilityStatus,
  Entity,
  VerificationOverride,
  VerificationReport,
  VerificationReportRow
} from "@/lib/types";

function loadBaseEntitiesFromJs(): Entity[] {
  const source = fs.readFileSync(ENTITIES_JS_PATH, "utf8");
  const script = new vm.Script(`${source}\n;ENTITIES;`);
  const entities = script.runInNewContext({}) as unknown;
  return Array.isArray(entities) ? (entities as Entity[]) : [];
}

function resolveAvailabilityStatus(row: AvailabilityAuditRow | undefined) {
  if (!row) {
    return "unknown" satisfies AvailabilityStatus;
  }
  const title = String(row.title || "").toLowerCase();
  const httpStatus = row.http_status;
  const status = String(row.status || "");
  const closureSignals = row.closure_signals || [];

  const hasBotBlockSignal =
    [401, 403, 405, 406, 429].includes(httpStatus || 0) ||
    title.includes("cloudflare") ||
    title.includes("checking your browser") ||
    title.includes("attention required") ||
    title.includes("not acceptable");

  if (status === "OK") {
    return closureSignals.length > 0 ? "needs_manual_check" : ("active" satisfies AvailabilityStatus);
  }
  if (hasBotBlockSignal) {
    return "needs_manual_check" satisfies AvailabilityStatus;
  }
  if (status === "FETCH_FAILED" || status === "HTTP_ERROR") {
    return "unreachable" satisfies AvailabilityStatus;
  }
  return "unknown" satisfies AvailabilityStatus;
}

function applyGlobalVcWebsite(entity: Entity, globalVcWebsites: Record<string, string>): Entity {
  if (!entity || entity.type !== "VC" || entity.market_scope !== "Global") {
    return entity;
  }

  const direct = globalVcWebsites[entity.name];
  const aliasMap: Record<string, string> = {
    "Accel (Global)": "Accel",
    "General Catalyst (Global)": "General Catalyst",
    "Bessemer Venture Partners (Global)": "Bessemer Venture Partners",
    "Menlo Ventures (Global)": "Menlo Ventures",
    "Khosla Ventures (Global)": "Khosla Ventures",
    "Matrix Partners (Global)": "Matrix Partners",
    "Norwest Venture Partners (Global)": "Norwest Venture Partners",
    "Thrive Capital (Global)": "Thrive Capital",
    "500 Global (Fund)": "500 Global",
    "Y Combinator (Fund)": "Y Combinator",
    "Techstars (Fund)": "Techstars"
  };

  const aliased = aliasMap[entity.name] ? globalVcWebsites[aliasMap[entity.name]] : undefined;
  const website = direct || aliased;
  if (!website) {
    return entity;
  }

  const current = typeof entity.apply_url === "string" ? entity.apply_url.trim() : "";
  if (current) {
    return entity;
  }

  return { ...entity, apply_url: website };
}

function applyIndiaVcWebsite(entity: Entity, indiaVcWebsites: Record<string, string>): Entity {
  if (!entity || entity.type !== "VC" || entity.market_scope !== "India") {
    return entity;
  }
  const website = indiaVcWebsites[entity.name];
  if (!website) {
    return entity;
  }
  return { ...entity, apply_url: website };
}

function loadOverrides(): Record<string, VerificationOverride> {
  const parsed = readJsonFile<Record<string, VerificationOverride> | null>(OVERRIDES_PATH, null);
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function saveOverride(name: string, override: VerificationOverride): void {
  const overrides = loadOverrides();
  overrides[name] = override;
  writeJsonFile(OVERRIDES_PATH, overrides);
}

function loadVerificationReport(): { generatedAt: string | null; byName: Map<string, VerificationReportRow> } {
  if (!fs.existsSync(VERIFICATION_REPORT_PATH)) {
    return { generatedAt: null, byName: new Map() };
  }
  const report = readJsonFile<VerificationReport | null>(VERIFICATION_REPORT_PATH, null);
  const generatedAt = report?.generated_at ?? null;
  const byName = new Map((report?.results || []).map((row) => [row.name, row]));
  return { generatedAt, byName };
}

function loadAvailabilityAudit(): { generatedAt: string | null; byName: Map<string, AvailabilityAuditRow> } {
  if (!fs.existsSync(AVAILABILITY_AUDIT_PATH)) {
    return { generatedAt: null, byName: new Map() };
  }
  const report = readJsonFile<AvailabilityAudit | null>(AVAILABILITY_AUDIT_PATH, null);
  const byName = new Map((report?.results || []).map((row) => [row.name, row]));
  return { generatedAt: report?.generated_at ?? null, byName };
}

function loadVcWebsites(): { global: Record<string, string>; india: Record<string, string> } {
  const global = readJsonFile<Record<string, string> | null>(GLOBAL_VC_WEBSITES_PATH, null);
  const india = readJsonFile<Record<string, string> | null>(INDIA_VC_WEBSITES_PATH, null);
  return {
    global: global && typeof global === "object" ? global : {},
    india: india && typeof india === "object" ? india : {}
  };
}

export function loadEntities(): Entity[] {
  const base = loadBaseEntitiesFromJs();
  const overrides = loadOverrides();
  const verification = loadVerificationReport();
  const availability = loadAvailabilityAudit();
  const vcWebsites = loadVcWebsites();

  const statusMap: Record<string, Entity["verification_status"]> = {
    MATCHED: "verified",
    SKIP_ROLLING: "unverified",
    FETCH_FAILED: "needs_review",
    NOT_FOUND: "needs_review",
    NO_END_DATE: "needs_review"
  };

  return base.map((raw) => {
    let entity: Entity = applyGlobalVcWebsite(raw, vcWebsites.global);
    entity = applyIndiaVcWebsite(entity, vcWebsites.india);

    const override = overrides[entity.name];
    const verificationRow = verification.byName.get(entity.name);
    const availabilityRow = availability.byName.get(entity.name);

    const fallback: Entity = {
      ...entity,
      verification_status: entity.verification_status || "unverified",
      last_verified_at: entity.last_verified_at || null,
      status: resolveAvailabilityStatus(availabilityRow),
      last_checked_at: availability.generatedAt
    };

    const mergedFromReport: Entity = verificationRow
      ? {
          ...entity,
          verification_status: statusMap[String(verificationRow.result)] || "unverified",
          last_verified_at: verification.generatedAt,
          source_url: verificationRow.url || entity.source_url || entity.apply_url || "",
          verification_result: verificationRow.result,
          verification_http_status: verificationRow.status || null,
          verification_error: verificationRow.error || null,
          status: resolveAvailabilityStatus(availabilityRow),
          last_checked_at: availability.generatedAt
        }
      : {
          ...fallback,
          source_url: entity.source_url || entity.apply_url || ""
        };

    if (!override) {
      return mergedFromReport;
    }

    return {
      ...mergedFromReport,
      verification_status: override.verification_status || mergedFromReport.verification_status,
      last_verified_at: override.last_verified_at || mergedFromReport.last_verified_at,
      source_url: override.source_url || mergedFromReport.source_url,
      verification_result: override.verification_result || "MANUAL_OVERRIDE",
      verification_error: null
    };
  });
}

