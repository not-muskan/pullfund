let entities = [];
const adminSearch = document.getElementById("adminSearch");
const adminTableBody = document.getElementById("adminTableBody");
const adminCount = document.getElementById("adminCount");
const verificationRunMeta = document.getElementById("verificationRunMeta");

function parseDate(value) {
  if (!value) return null;
  if (String(value).includes("T")) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString() : "-";
}

function getDataIssues(entity) {
  const issues = [];
  const deadlines = Array.isArray(entity.deadlines) && entity.deadlines.length > 0
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

function getVerification(entity) {
  return entity.verification_status || "unverified";
}

function getStatus(entity) {
  return entity.status || "unknown";
}

function statusClassName(status) {
  if (status === "active") return "status-green";
  if (status === "needs_manual_check") return "status-yellow";
  return "status-gray";
}

function filterEntities() {
  const query = adminSearch.value.trim().toLowerCase();
  if (!query) return entities;
  return entities.filter((entity) => entity.name.toLowerCase().includes(query));
}

function renderTable() {
  const items = filterEntities();
  adminCount.textContent = `${items.length} records`;
  adminTableBody.innerHTML = "";

  for (const entity of items) {
    const issues = getDataIssues(entity);
    const verification = getVerification(entity);
    const status = getStatus(entity);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entity.name}</td>
      <td>${entity.type}</td>
      <td><span class="tag ${verification === "verified" ? "status-green" : verification === "needs_review" ? "status-yellow" : "status-gray"}">${verification}</span></td>
      <td>${entity.verification_result || "-"}</td>
      <td><span class="tag ${statusClassName(status)}">${status}</span></td>
      <td>${formatDate(entity.last_checked_at)}</td>
      <td>${formatDate(entity.last_verified_at)}</td>
      <td>${issues.length ? issues.join(", ") : "None"}</td>
      <td>${entity.source_url ? `<a href="${entity.source_url}" target="_blank" rel="noopener noreferrer">Open</a>` : "-"}</td>
      <td>
        <button class="calendar-btn mark-verified-btn" data-name="${entity.name}">
          Mark Verified
        </button>
      </td>
    `;
    adminTableBody.append(row);
  }
}

async function markVerified(name) {
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

  entity.verification_status = "verified";
  entity.verification_result = "MANUAL_OVERRIDE";
  entity.last_verified_at = new Date().toISOString().slice(0, 10);
  renderTable();
}

async function init() {
  const [entitiesResponse, reportResponse] = await Promise.all([
    fetch("/api/entities"),
    fetch("/api/verification-report")
  ]);

  const data = await entitiesResponse.json();
  entities = data;

  if (reportResponse.ok) {
    const report = await reportResponse.json();
    const summary = report.summary || {};
    verificationRunMeta.textContent =
      `Last run: ${new Date(report.generated_at).toLocaleString()} | ` +
      `Matched: ${summary.MATCHED || 0}, Not found: ${summary.NOT_FOUND || 0}, ` +
      `Fetch failed: ${summary.FETCH_FAILED || 0}, Rolling: ${summary.SKIP_ROLLING || 0}`;
  } else {
    verificationRunMeta.textContent = "Verification report unavailable.";
  }

  renderTable();
}

adminSearch.addEventListener("input", renderTable);
adminTableBody.addEventListener("click", (event) => {
  const button = event.target.closest(".mark-verified-btn");
  if (!button) return;
  markVerified(button.dataset.name);
});
init();
