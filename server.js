const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const vm = require("node:vm");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const OVERRIDES_PATH = path.join(ROOT, "verification-overrides.json");
const VERIFICATION_REPORT_PATH = path.join(ROOT, "verification-report.json");
const AVAILABILITY_AUDIT_PATH = path.join(ROOT, "availability-audit.json");
const DATA_DIR = path.join(ROOT, "data");
const GLOBAL_VC_WEBSITES_PATH = path.join(DATA_DIR, "vc-websites.global.json");
const INDIA_VC_WEBSITES_PATH = path.join(DATA_DIR, "vc-websites.india.json");

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  return "text/plain; charset=utf-8";
}

function loadEntities() {
  const dataPath = path.join(ROOT, "data.js");
  const source = fs.readFileSync(dataPath, "utf8");
  const script = new vm.Script(`${source}\n;ENTITIES;`);
  const entities = script.runInNewContext({});
  const base = Array.isArray(entities) ? entities : [];

  let verificationByName = new Map();
  let generatedAt = null;
  if (fs.existsSync(VERIFICATION_REPORT_PATH)) {
    const report = JSON.parse(fs.readFileSync(VERIFICATION_REPORT_PATH, "utf8"));
    generatedAt = report.generated_at || null;
    verificationByName = new Map(
      (report.results || []).map((row) => [row.name, row])
    );
  }
  const overrides = loadOverrides();
  const availability = loadAvailabilityAudit();
  const availabilityByName = availability.byName;
  const checkedAt = availability.generatedAt;
  const globalVcWebsites = loadGlobalVcWebsites();
  const indiaVcWebsites = loadIndiaVcWebsites();

  return base.map((entity) => {
    entity = applyGlobalVcWebsite(entity, globalVcWebsites);
    entity = applyIndiaVcWebsite(entity, indiaVcWebsites);
    const override = overrides[entity.name];
    const verification = verificationByName.get(entity.name);
    if (!verification) {
      const fallback = {
        ...entity,
        verification_status: entity.verification_status || "unverified",
        last_verified_at: entity.last_verified_at || null,
        status: resolveAvailabilityStatus(availabilityByName.get(entity.name)),
        last_checked_at: checkedAt
      };
      if (!override) {
        return fallback;
      }
      return {
        ...fallback,
        verification_status: override.verification_status || fallback.verification_status,
        last_verified_at: override.last_verified_at || fallback.last_verified_at,
        source_url: override.source_url || fallback.source_url || fallback.apply_url || "",
        verification_result: override.verification_result || "MANUAL_OVERRIDE",
        verification_error: null
      };
    }

    const statusMap = {
      MATCHED: "verified",
      SKIP_ROLLING: entity.verification_status || "unverified",
      FETCH_FAILED: "needs_review",
      NOT_FOUND: "needs_review",
      NO_END_DATE: "needs_review"
    };

    const merged = {
      ...entity,
      verification_status: statusMap[verification.result] || "unverified",
      last_verified_at: generatedAt,
      source_url: verification.url || entity.source_url || entity.apply_url || "",
      verification_result: verification.result,
      verification_http_status: verification.status || null,
      verification_error: verification.error || null,
      status: resolveAvailabilityStatus(availabilityByName.get(entity.name)),
      last_checked_at: checkedAt
    };
    if (!override) {
      return merged;
    }
    return {
      ...merged,
      verification_status: override.verification_status || merged.verification_status,
      last_verified_at: override.last_verified_at || merged.last_verified_at,
      source_url: override.source_url || merged.source_url,
      verification_result: override.verification_result || "MANUAL_OVERRIDE",
      verification_error: null
    };
  });
}

function loadGlobalVcWebsites() {
  if (!fs.existsSync(GLOBAL_VC_WEBSITES_PATH)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(GLOBAL_VC_WEBSITES_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadIndiaVcWebsites() {
  if (!fs.existsSync(INDIA_VC_WEBSITES_PATH)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(INDIA_VC_WEBSITES_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function applyGlobalVcWebsite(entity, globalVcWebsites) {
  if (!entity || entity.type !== "VC" || entity.market_scope !== "Global") {
    return entity;
  }

  const direct = globalVcWebsites[entity.name];
  const aliasMap = {
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

  // Only override if missing/blank.
  const current = typeof entity.apply_url === "string" ? entity.apply_url.trim() : "";
  if (current) {
    return entity;
  }

  return { ...entity, apply_url: website };
}

function applyIndiaVcWebsite(entity, indiaVcWebsites) {
  if (!entity || entity.type !== "VC" || entity.market_scope !== "India") {
    return entity;
  }

  const website = indiaVcWebsites[entity.name];
  if (!website) {
    return entity;
  }

  // India VC links should be canonical when present in our mapping.
  return { ...entity, apply_url: website };
}

function loadAvailabilityAudit() {
  if (!fs.existsSync(AVAILABILITY_AUDIT_PATH)) {
    return { generatedAt: null, byName: new Map() };
  }
  try {
    const report = JSON.parse(fs.readFileSync(AVAILABILITY_AUDIT_PATH, "utf8"));
    const byName = new Map((report.results || []).map((row) => [row.name, row]));
    return {
      generatedAt: report.generated_at || null,
      byName
    };
  } catch {
    return { generatedAt: null, byName: new Map() };
  }
}

function resolveAvailabilityStatus(row) {
  if (!row) {
    return "unknown";
  }
  const title = String(row.title || "").toLowerCase();
  const hasBotBlockSignal =
    [401, 403, 405, 406, 429].includes(row.http_status) ||
    title.includes("cloudflare") ||
    title.includes("checking your browser") ||
    title.includes("attention required") ||
    title.includes("not acceptable");

  if (row.status === "OK") {
    return (row.closure_signals || []).length > 0 ? "needs_manual_check" : "active";
  }
  if (hasBotBlockSignal) {
    return "needs_manual_check";
  }
  if (row.status === "FETCH_FAILED" || row.status === "HTTP_ERROR") {
    return "unreachable";
  }
  return "unknown";
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides) {
  fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      const code = error.code === "ENOENT" ? 404 : 500;
      res.writeHead(code, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(code === 404 ? "Not found" : "Internal server error");
      return;
    }
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (reqUrl.pathname === "/api/entities") {
    try {
      const entities = loadEntities();
      sendJson(res, 200, entities);
    } catch (error) {
      sendJson(res, 500, { error: "Failed to load entities" });
    }
    return;
  }

  if (reqUrl.pathname === "/api/verification-report") {
    if (!fs.existsSync(VERIFICATION_REPORT_PATH)) {
      sendJson(res, 404, { error: "Verification report not found" });
      return;
    }
    const report = JSON.parse(fs.readFileSync(VERIFICATION_REPORT_PATH, "utf8"));
    sendJson(res, 200, report);
    return;
  }

  if (reqUrl.pathname === "/api/admin/verify" && req.method === "POST") {
    readJsonBody(req)
      .then((payload) => {
        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        const sourceUrl = typeof payload.source_url === "string" ? payload.source_url.trim() : "";
        if (!name) {
          sendJson(res, 400, { error: "Missing entity name" });
          return;
        }

        const overrides = loadOverrides();
        overrides[name] = {
          verification_status: "verified",
          last_verified_at: new Date().toISOString(),
          source_url: sourceUrl,
          verification_result: "MANUAL_OVERRIDE"
        };
        saveOverrides(overrides);
        sendJson(res, 200, { ok: true });
      })
      .catch(() => {
        sendJson(res, 400, { error: "Invalid JSON body" });
      });
    return;
  }

  let filePath = reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname;
  filePath = path.normalize(path.join(ROOT, filePath));
  sendFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`PullFund backend running at http://${HOST}:${PORT}`);
});
