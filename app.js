const state = {
  type: "All",
  scope: "Global",
  search: "",
  sectors: new Set()
};
let entities = [];

const tabs = document.querySelectorAll(".tab");
const scopeTabs = document.querySelectorAll(".scope-tab");
const searchInput = document.getElementById("searchInput");
const sectorFilter = document.getElementById("sectorFilter");
const entityList = document.getElementById("entityList");
const cardTemplate = document.getElementById("entityCardTemplate");
const resultCount = document.getElementById("resultCount");

function getDeadlines(entity) {
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

function getPrimaryDeadline(entity) {
  const deadlines = getDeadlines(entity);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fixed = deadlines
    .filter((deadline) => !deadline.is_rolling && deadline.app_end)
    .sort((a, b) => parseDate(a.app_end) - parseDate(b.app_end));
  const upcoming = fixed.find((deadline) => parseDate(deadline.app_end) >= today);
  return upcoming || fixed[0] || deadlines[0];
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}

function daysUntil(endDate) {
  const now = new Date();
  const midnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = endDate - midnightToday;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getStatus(deadline) {
  if (deadline.is_rolling) {
    return { label: "Rolling", className: "status-gray" };
  }

  const now = new Date();
  const start = parseDate(deadline.app_start);
  const end = parseDate(deadline.app_end);
  if (!end) {
    return { label: "Closed", className: "status-gray" };
  }

  if (start && now < start) {
    return { label: "Upcoming", className: "status-gray" };
  }

  if (now > end) {
    return { label: "Closed", className: "status-gray" };
  }

  const daysLeft = daysUntil(end);
  if (daysLeft <= 14) {
    return { label: "Deadline Soon", className: "status-yellow" };
  }

  return { label: "Accepting", className: "status-green" };
}

function formatDate(value) {
  if (!value) {
    return "N/A";
  }
  const date = parseDate(value);
  return date ? date.toLocaleDateString() : "N/A";
}

function getScope(entity) {
  if (entity.market_scope === "Global" || entity.market_scope === "India") {
    return entity.market_scope;
  }

  const text = `${entity.name} ${entity.location} ${entity.description}`.toLowerCase();

  if (
    /india|indian|iit|iim|dpiit|tamil nadu|bangalore|andhra pradesh|naarm|t-hub/.test(text)
  ) {
    return "India";
  }

  if (
    /global|worldwide|emerging markets|open worldwide|international/.test(text)
  ) {
    return "Global";
  }

  // Country-restricted or unclear opportunities are not treated as global by default.
  return "Other";
}

function entityMatches(entity) {
  const matchesType = state.type === "All" || entity.type === state.type;
  const scope = getScope(entity);
  const matchesScope = state.scope === "All" || scope === state.scope;
  const text = `${entity.name} ${entity.description} ${entity.location} ${entity.sectors.join(" ")}`.toLowerCase();
  const matchesSearch = text.includes(state.search.toLowerCase());
  const selectedSectors = Array.from(state.sectors);
  const matchesSectors =
    selectedSectors.length === 0 || selectedSectors.every((sector) => entity.sectors.includes(sector));
  return matchesType && matchesScope && matchesSearch && matchesSectors;
}

function filteredEntities() {
  return entities.filter(entityMatches).sort((a, b) => {
    const aRank = a.investments ?? -1;
    const bRank = b.investments ?? -1;
    return bRank - aRank;
  });
}

function renderEntities(items) {
  entityList.innerHTML = "";
  resultCount.textContent = `${items.length} results`;

  if (items.length === 0) {
    entityList.innerHTML = `<p class="empty">No entities match your filters.</p>`;
    return;
  }

  for (const entity of items) {
    const fragment = cardTemplate.content.cloneNode(true);
    const primaryDeadline = getPrimaryDeadline(entity);
    const status = getStatus(primaryDeadline);

    fragment.querySelector(".entity-name").textContent = entity.name;
    fragment.querySelector(".entity-meta").textContent =
      `${entity.type} • ${entity.location}` +
      (entity.investments ? ` • Investments: ${entity.investments.toLocaleString()}` : "");
    fragment.querySelector(".entity-description").textContent = entity.description;
    fragment.querySelector(".apply-link").href = entity.apply_url;
    const deadlines = getDeadlines(entity);
    if (deadlines.length > 0) {
      const info = document.createElement("p");
      info.className = "entity-deadlines";
      info.textContent = deadlines
        .map((deadline) => {
          const labelPrefix = deadline.label && deadline.label !== "Main" ? `${deadline.label}: ` : "";
          const windowText = deadline.is_rolling ? "Rolling basis" : `Deadline: ${formatDate(deadline.app_end)}`;
          return `${labelPrefix}${windowText}`;
        })
        .join(" | ");
      fragment.querySelector(".entity-description").after(info);
    }

    const tagsNode = fragment.querySelector(".tags");
    for (const sector of entity.sectors) {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = sector;
      tagsNode.append(span);
    }
    const statusTag = document.createElement("span");
    statusTag.className = `tag ${status.className}`;
    statusTag.textContent = status.label;
    tagsNode.append(statusTag);

    entityList.append(fragment);
  }
}

function syncSectors() {
  const allSectors = [...new Set(entities.flatMap((entity) => entity.sectors))].sort((a, b) =>
    a.localeCompare(b)
  );
  sectorFilter.innerHTML = "";
  for (const sector of allSectors) {
    const option = document.createElement("option");
    option.value = sector;
    option.textContent = sector;
    sectorFilter.append(option);
  }
}

function render() {
  const items = filteredEntities();
  renderEntities(items);
}

async function loadEntities() {
  try {
    const response = await fetch("/api/entities");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    entities = data.map((entity) => ({
      verification_status: "unverified",
      last_verified_at: null,
      source_url: "",
      deadlines: Array.isArray(entity.deadlines) ? entity.deadlines : [],
      ...entity
    }));
  } catch (error) {
    // Fallback keeps local file-open previews usable.
    if (typeof ENTITIES !== "undefined") {
      entities = ENTITIES;
      return;
    }
    entityList.innerHTML = `<p class="empty">Could not load data from backend.</p>`;
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    tabs.forEach((button) => button.classList.remove("active"));
    tab.classList.add("active");
    state.type = tab.dataset.type;
    render();
  });
}

for (const tab of scopeTabs) {
  tab.addEventListener("click", () => {
    scopeTabs.forEach((button) => button.classList.remove("active"));
    tab.classList.add("active");
    state.scope = tab.dataset.scope;
    render();
  });
}

searchInput.addEventListener("input", () => {
  state.search = searchInput.value.trim();
  render();
});

sectorFilter.addEventListener("change", () => {
  state.sectors = new Set(Array.from(sectorFilter.selectedOptions).map((option) => option.value));
  render();
});

async function init() {
  await loadEntities();
  syncSectors();
  render();
}

init();
