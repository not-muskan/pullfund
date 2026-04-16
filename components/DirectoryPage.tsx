"use client";

import { useDeferredValue, useMemo, useState } from "react";

import type { Deadline, Entity } from "@/lib/types";
import PullFundLogo from "@/components/PullFundLogo";

type TabType = "All" | Entity["type"];
type ScopeTab = "All" | "Global" | "India";

type StatusTag = { label: string; className: string; priority: number };
type DirectoryPageProps = { initialEntities: Entity[]; todayKey: string };

const TYPE_OPTIONS = ["All", "Incubator", "Accelerator", "Grants", "VC"] as const satisfies readonly TabType[];
const SCOPE_OPTIONS = ["All", "Global", "India"] as const satisfies readonly ScopeTab[];
const FEATURED_SECTOR_LIMIT = 10;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getTodayDate(todayKey: string): Date {
  return new Date(`${todayKey}T00:00:00.000Z`);
}

function daysUntil(endDate: Date, today: Date): number {
  const diffMs = endDate.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getDeadlines(entity: Entity): Deadline[] {
  if (Array.isArray(entity.deadlines) && entity.deadlines.length > 0) {
    return entity.deadlines.map((deadline) => ({
      label: deadline.label || "Program",
      app_start: deadline.app_start ?? null,
      app_end: deadline.app_end ?? null,
      is_rolling: Boolean(deadline.is_rolling)
    }));
  }
  return [
    {
      label: "Main",
      app_start: entity.app_start ?? null,
      app_end: entity.app_end ?? null,
      is_rolling: Boolean(entity.is_rolling)
    }
  ];
}

function getPrimaryDeadline(entity: Entity, today: Date): Deadline {
  const deadlines = getDeadlines(entity);
  const fixed = deadlines
    .filter((deadline) => !deadline.is_rolling && deadline.app_end)
    .sort((a, b) => (parseDate(a.app_end)?.getTime() ?? 0) - (parseDate(b.app_end)?.getTime() ?? 0));
  const upcoming = fixed.find((deadline) => (parseDate(deadline.app_end)?.getTime() ?? 0) >= today.getTime());
  return upcoming || fixed[0] || deadlines[0];
}

function getStatus(deadline: Deadline, today: Date): StatusTag {
  if (deadline.is_rolling) {
    return { label: "Rolling", className: "status-blue", priority: 2 };
  }
  const start = parseDate(deadline.app_start);
  const end = parseDate(deadline.app_end);
  if (!end) {
    return { label: "Closed", className: "status-gray", priority: 5 };
  }
  if (start && today < start) {
    return { label: "Upcoming", className: "status-gray", priority: 3 };
  }
  if (today > end) {
    return { label: "Closed", className: "status-gray", priority: 5 };
  }
  const daysLeft = daysUntil(end, today);
  if (daysLeft <= 14) {
    return { label: "Closing soon", className: "status-yellow", priority: 0 };
  }
  return { label: "Open", className: "status-green", priority: 1 };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
      })
    : "N/A";
}

function getScope(entity: Entity): "Global" | "India" | "Other" {
  if (entity.market_scope === "Global" || entity.market_scope === "India") {
    return entity.market_scope;
  }

  const text = `${entity.name} ${entity.location} ${entity.description}`.toLowerCase();
  if (/india|indian|iit|iim|dpiit|tamil nadu|bangalore|andhra pradesh|naarm|t-hub/.test(text)) {
    return "India";
  }
  if (/global|worldwide|emerging markets|open worldwide|international/.test(text)) {
    return "Global";
  }
  return "Other";
}

function getTimelineCopy(deadline: Deadline, today: Date): { eyebrow: string; detail: string } {
  const start = parseDate(deadline.app_start);
  const end = parseDate(deadline.app_end);

  if (deadline.is_rolling) {
    return {
      eyebrow: "Application window",
      detail: "Rolling admissions"
    };
  }

  if (start && today < start) {
    const openInDays = daysUntil(start, today);
    return {
      eyebrow: `Opens ${formatDate(deadline.app_start)}`,
      detail: openInDays <= 1 ? "Opens tomorrow" : `Opens in ${openInDays} days`
    };
  }

  if (end && today > end) {
    return {
      eyebrow: `Closed ${formatDate(deadline.app_end)}`,
      detail: "Application window has ended"
    };
  }

  if (end) {
    const daysLeft = daysUntil(end, today);
    return {
      eyebrow: `Closes ${formatDate(deadline.app_end)}`,
      detail: daysLeft <= 1 ? "Last day to apply" : `${daysLeft} days remaining`
    };
  }

  return {
    eyebrow: "Application window",
    detail: "Timeline unavailable"
  };
}

function getFeaturedSectors(entities: Entity[]): string[] {
  const counts = new Map<string, number>();
  for (const entity of entities) {
    for (const sector of entity.sectors || []) {
      counts.set(sector, (counts.get(sector) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FEATURED_SECTOR_LIMIT)
    .map(([sector]) => sector);
}

function Stat({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`filter-pill ${active ? "active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function getSortTimestamp(deadline: Deadline): number {
  if (deadline.is_rolling) return Number.POSITIVE_INFINITY;
  return parseDate(deadline.app_end)?.getTime() ?? Number.POSITIVE_INFINITY;
}

function formatLocation(entity: Entity, scope: "Global" | "India" | "Other"): string {
  const normalizedLocation = entity.location
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (normalizedLocation.some((part) => part.toLowerCase() === scope.toLowerCase())) {
    return normalizedLocation.join(" / ");
  }

  return [...normalizedLocation, scope].join(" / ");
}

function EntityCard({ entity, today }: { entity: Entity; today: Date }) {
  const primaryDeadline = getPrimaryDeadline(entity, today);
  const status = getStatus(primaryDeadline, today);
  const scope = getScope(entity);
  const timeline = getTimelineCopy(primaryDeadline, today);
  const secondaryDeadlineCount = Math.max(getDeadlines(entity).length - 1, 0);

  return (
    <article className="entity-card">
      <div className="card-topline">
        <span className={`tag ${status.className}`}>{status.label}</span>
        <span className="eyebrow">{entity.type}</span>
      </div>

      <div className="card-header">
        <div>
          <h2 className="entity-name">{entity.name}</h2>
          <p className="entity-location">{formatLocation(entity, scope)}</p>
        </div>
        {entity.investments ? <p className="entity-investments">{entity.investments.toLocaleString()} investments</p> : null}
      </div>

      <p className="entity-description">{entity.description}</p>

      <div className="card-metrics">
        <div>
          <span className="metric-label">{timeline.eyebrow}</span>
          <strong className="metric-value">{timeline.detail}</strong>
        </div>
        <div>
          <span className="metric-label">Focus areas</span>
          <strong className="metric-value">
            {entity.sectors.slice(0, 3).join(", ") || "Generalist"}
            {entity.sectors.length > 3 ? ` +${entity.sectors.length - 3}` : ""}
          </strong>
        </div>
      </div>

      {secondaryDeadlineCount > 0 ? (
        <p className="card-note">
          Includes {secondaryDeadlineCount} additional deadline{secondaryDeadlineCount > 1 ? "s" : ""}.
        </p>
      ) : null}

      <div className="tags">
        <span className="tag tag-muted">{scope}</span>
        {(entity.sectors || []).slice(0, 4).map((sector) => (
          <span key={sector} className="tag tag-muted">
            {sector}
          </span>
        ))}
      </div>

      <div className="actions">
        <a className="apply-link" href={entity.apply_url} target="_blank" rel="noopener noreferrer">
          Open application
        </a>
      </div>
    </article>
  );
}

export default function DirectoryPage({ initialEntities, todayKey }: DirectoryPageProps) {
  const entities = initialEntities;
  const today = useMemo(() => getTodayDate(todayKey), [todayKey]);

  const [type, setType] = useState<TabType>("All");
  const [scope, setScope] = useState<ScopeTab>("All");
  const [search, setSearch] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [showAllSectors, setShowAllSectors] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const allSectors = useMemo(() => {
    const set = new Set<string>();
    for (const entity of entities) {
      for (const s of entity.sectors || []) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entities]);

  const featuredSectors = useMemo(() => getFeaturedSectors(entities), [entities]);
  const visibleSectors = showAllSectors ? allSectors : featuredSectors;

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return entities
      .filter((entity) => {
        const matchesType = type === "All" || entity.type === type;
        const entityScope = getScope(entity);
        const matchesScope = scope === "All" || entityScope === scope;
        const text = `${entity.name} ${entity.description} ${entity.location} ${entity.sectors.join(" ")}`.toLowerCase();
        const matchesSearch = query.length === 0 || text.includes(query);
        const matchesSectors =
          sectors.length === 0 || sectors.every((sector) => (entity.sectors || []).includes(sector));
        return matchesType && matchesScope && matchesSearch && matchesSectors;
      })
      .sort((a, b) => {
        const aDeadline = getPrimaryDeadline(a, today);
        const bDeadline = getPrimaryDeadline(b, today);
        const aStatus = getStatus(aDeadline, today);
        const bStatus = getStatus(bDeadline, today);
        if (aStatus.priority !== bStatus.priority) {
          return aStatus.priority - bStatus.priority;
        }

        const deadlineDelta = getSortTimestamp(aDeadline) - getSortTimestamp(bDeadline);
        if (deadlineDelta !== 0) {
          return deadlineDelta;
        }

        const aRank = a.investments ?? -1;
        const bRank = b.investments ?? -1;
        return bRank - aRank;
      });
  }, [deferredSearch, entities, scope, sectors, today, type]);

  const activeCount = useMemo(
    () =>
      entities.filter((entity) => ["Open", "Closing soon", "Rolling"].includes(getStatus(getPrimaryDeadline(entity, today), today).label))
        .length,
    [entities, today]
  );
  const rollingCount = useMemo(
    () => entities.filter((entity) => getStatus(getPrimaryDeadline(entity, today), today).label === "Rolling").length,
    [entities, today]
  );
  const clearFiltersVisible = search.length > 0 || sectors.length > 0 || type !== "All" || scope !== "All";

  return (
    <>
      <header className="container hero">
        <div className="hero-copy">
          <PullFundLogo className="pullfund-brand" />
          <p className="hero-kicker">Founder funding directory</p>
          <h1>Find the right program before the window closes.</h1>
          <p className="hero-summary">
            <strong>PullFund</strong> turns a scattered list of grants, accelerators, incubators, and VC funds into a
            sharper operating surface for founders. Search by geography, narrow by category, and move straight to the
            application link before attention shifts somewhere else.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="#directory">
              Explore opportunities
            </a>
            <p className="hero-helper">Sorted by application status, nearest deadline, then investment footprint.</p>
          </div>
        </div>

        <div className="hero-stats" aria-label="Directory overview">
          <Stat label="Tracked entities" value={entities.length.toLocaleString()} />
          <Stat label="Open or rolling" value={activeCount.toLocaleString()} />
          <Stat label="Rolling programs" value={rollingCount.toLocaleString()} />
          <Stat label="Covered markets" value="Global + India" />
        </div>
      </header>

      <main className="container">
        <section className="controls directory-shell" id="directory" aria-label="Directory filters">
          <div className="controls-header">
            <div>
              <p className="section-kicker">Directory</p>
              <div className="section-head">
                <h2>Shortlist live opportunities faster.</h2>
                <p id="resultCount">{filtered.length} matches</p>
              </div>
            </div>

            {clearFiltersVisible ? (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setType("All");
                  setScope("All");
                  setSearch("");
                  setSectors([]);
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="search-wrap">
            <label className="sr-only" htmlFor="searchInput">
              Search programs or funds
            </label>
            <input
              id="searchInput"
              type="search"
              placeholder="Search by name, description, geography, or sector"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-block">
            <span className="filter-label">Market</span>
            <div className="filter-row" role="tablist" aria-label="Market scope tabs">
              {SCOPE_OPTIONS.map((option) => (
                <FilterPill key={option} active={scope === option} onClick={() => setScope(option)}>
                  {option}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <span className="filter-label">Category</span>
            <div className="filter-row" role="tablist" aria-label="Entity category tabs">
              {TYPE_OPTIONS.map((option) => (
                <FilterPill key={option} active={type === option} onClick={() => setType(option)}>
                  {option === "Incubator"
                    ? "Incubators"
                    : option === "Accelerator"
                      ? "Accelerators"
                      : option === "VC"
                        ? "VC funds"
                        : option}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <div className="filter-heading">
              <span className="filter-label">Sectors</span>
              {allSectors.length > featuredSectors.length ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShowAllSectors((current) => !current)}
                >
                  {showAllSectors ? "Show fewer" : `Show all ${allSectors.length}`}
                </button>
              ) : null}
            </div>
            <div className="filter-row">
              {visibleSectors.map((sector) => {
                const active = sectors.includes(sector);
                return (
                  <FilterPill
                    key={sector}
                    active={active}
                    onClick={() =>
                      setSectors((current) =>
                        current.includes(sector)
                          ? current.filter((item) => item !== sector)
                          : [...current, sector]
                      )
                    }
                  >
                    {sector}
                  </FilterPill>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <h3>No matches for this combination.</h3>
              <p className="empty">
                Widen the market scope or remove a sector filter to bring more programs back into view.
              </p>
            </div>
          ) : (
            <div id="entityList" className="entity-grid">
              {filtered.map((entity) => (
                <EntityCard key={entity.name} entity={entity} today={today} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
