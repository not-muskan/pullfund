import path from "node:path";

export const ROOT_DIR = process.cwd();
export const DATA_DIR = path.join(ROOT_DIR, "data");

export const ENTITIES_JS_PATH = path.join(ROOT_DIR, "data.js");
export const OVERRIDES_PATH = path.join(ROOT_DIR, "verification-overrides.json");
export const VERIFICATION_REPORT_PATH = path.join(ROOT_DIR, "verification-report.json");
export const AVAILABILITY_AUDIT_PATH = path.join(ROOT_DIR, "availability-audit.json");

export const GLOBAL_VC_WEBSITES_PATH = path.join(DATA_DIR, "vc-websites.global.json");
export const INDIA_VC_WEBSITES_PATH = path.join(DATA_DIR, "vc-websites.india.json");

