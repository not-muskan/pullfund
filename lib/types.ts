export type MarketScope = "Global" | "India" | "Other";
export type EntityType = "Incubator" | "Accelerator" | "Grants" | "VC";

export type VerificationStatus = "verified" | "unverified" | "needs_review";
export type AvailabilityStatus = "active" | "needs_manual_check" | "unreachable" | "unknown";

export type Deadline = {
  label?: string;
  app_start: string | null;
  app_end: string | null;
  is_rolling: boolean;
};

export type Entity = {
  name: string;
  type: EntityType;
  location: string;
  investments: number | null;
  sectors: string[];
  app_start: string | null;
  app_end: string | null;
  is_rolling: boolean;
  description: string;
  apply_url: string;
  market_scope?: MarketScope;
  deadlines?: Deadline[];

  verification_status?: VerificationStatus;
  last_verified_at?: string | null;
  source_url?: string;
  verification_result?: string;
  verification_http_status?: number | null;
  verification_error?: string | null;

  status?: AvailabilityStatus;
  last_checked_at?: string | null;
};

export type VerificationOverride = {
  verification_status?: VerificationStatus;
  last_verified_at?: string;
  source_url?: string;
  verification_result?: string;
};

export type VerificationReportRow = {
  name: string;
  result: string;
  url?: string;
  status?: number;
  error?: string;
};

export type VerificationReport = {
  generated_at?: string;
  summary?: Record<string, number>;
  results?: VerificationReportRow[];
};

export type AvailabilityAuditRow = {
  name: string;
  status: string;
  http_status?: number;
  title?: string;
  closure_signals?: string[];
};

export type AvailabilityAudit = {
  generated_at?: string;
  results?: AvailabilityAuditRow[];
};

