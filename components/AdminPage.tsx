"use client";

import { useEffect, useMemo, useState } from "react";

import type { Entity, VerificationReport } from "@/lib/types";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (String(value).includes("T")) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString() : "-";
}

function statusClassName(status: string) {
  if (status === "active") return "status-green";
  if (status === "needs_manual_check") return "status-yellow";
  return "status-gray";
}

function getDataIssues(entity: Entity): string[] {
  const issues: string[] = [];
  const deadlines =
    Array.isArray(entity.deadlines) && entity.deadlines.length > 0
      ? entity.deadlines
      : [{ app_start: entity.app_start, app_end: entity.app_end, is_rolling: entity.is_rolling }];

  for (const deadline of deadlines) {
    const start = parseDate(deadline.app_start);
    const end = parseDate(deadline.app_end);
    if (!deadline.is_rolling && (!start || !end)) {
      issues.push("Missing dates");
      break;
    }
    if (start && end && end < start) {
      issues.push("End date before start");
      break;
    }
    if (deadline.is_rolling && (deadline.app_start || deadline.app_end)) {
      issues.push("Rolling + fixed date mismatch");
      break;
    }
  }
  if (!entity.source_url) {
    issues.push("Missing source URL");
  }
  return issues;
}

export default function AdminPage() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [query, setQuery] = useState("");
  const [meta, setMeta] = useState<string>("Loading verification report…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const [entitiesResponse, reportResponse] = await Promise.all([
          fetch("/api/entities", { cache: "no-store" }),
          fetch("/api/verification-report", { cache: "no-store" })
        ]);

        if (!entitiesResponse.ok) throw new Error(`Entities HTTP ${entitiesResponse.status}`);
        const data = (await entitiesResponse.json()) as Entity[];
        if (!cancelled) setEntities(data);

        if (reportResponse.ok) {
          const report = (await reportResponse.json()) as VerificationReport;
          const summary = report.summary || {};
          const generated = report.generated_at ? new Date(report.generated_at).toLocaleString() : "unknown";
          if (!cancelled) {
            setMeta(
              `Last run: ${generated} | Matched: ${summary.MATCHED || 0}, Not found: ${summary.NOT_FOUND || 0}, ` +
                `Fetch failed: ${summary.FETCH_FAILED || 0}, Rolling: ${summary.SKIP_ROLLING || 0}`
            );
          }
        } else {
          if (!cancelled) setMeta("Verification report unavailable.");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setMeta("Verification report unavailable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter((e) => e.name.toLowerCase().includes(q));
  }, [entities, query]);

  async function markVerified(name: string) {
    const entity = entities.find((item) => item.name === name);
    if (!entity) return;

    const response = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: entity.name,
        source_url: entity.source_url || entity.apply_url || ""
      })
    });
    if (!response.ok) {
      alert("Could not mark record as verified.");
      return;
    }

    setEntities((prev) =>
      prev.map((row) =>
        row.name !== name
          ? row
          : {
              ...row,
              verification_status: "verified",
              verification_result: "MANUAL_OVERRIDE",
              last_verified_at: new Date().toISOString().slice(0, 10)
            }
      )
    );
  }

  return (
    <>
      <header className="container header">
        <div>
          <h1>PullFund Admin</h1>
          <p className="subtitle">Verification and data quality dashboard</p>
        </div>
      </header>

      <main className="container">
        <section className="controls">
          <div className="section-head">
            <h2>Data Verification</h2>
            <p id="adminCount">{loading ? "Loading…" : `${filtered.length} records`}</p>
          </div>
          <p id="verificationRunMeta" className="subtitle">
            {meta}
          </p>
          <div className="search-wrap">
            <input
              id="adminSearch"
              type="search"
              placeholder="Search entity name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {error ? <p className="empty">Could not load admin data. ({error})</p> : null}
        </section>

        <section className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Verification</th>
                <th>Run Result</th>
                <th>Status</th>
                <th>Last Checked</th>
                <th>Last Verified</th>
                <th>Issues</th>
                <th>Source</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="adminTableBody">
              {filtered.map((entity) => {
                const issues = getDataIssues(entity);
                const verification = entity.verification_status || "unverified";
                const status = entity.status || "unknown";
                return (
                  <tr key={entity.name}>
                    <td>{entity.name}</td>
                    <td>{entity.type}</td>
                    <td>
                      <span
                        className={`tag ${
                          verification === "verified"
                            ? "status-green"
                            : verification === "needs_review"
                              ? "status-yellow"
                              : "status-gray"
                        }`}
                      >
                        {verification}
                      </span>
                    </td>
                    <td>{entity.verification_result || "-"}</td>
                    <td>
                      <span className={`tag ${statusClassName(status)}`}>{status}</span>
                    </td>
                    <td>{formatDate(entity.last_checked_at)}</td>
                    <td>{formatDate(entity.last_verified_at)}</td>
                    <td>{issues.length ? issues.join(", ") : "None"}</td>
                    <td>
                      {entity.source_url ? (
                        <a href={entity.source_url} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <button
                        className="calendar-btn mark-verified-btn"
                        type="button"
                        onClick={() => markVerified(entity.name)}
                      >
                        Mark Verified
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

