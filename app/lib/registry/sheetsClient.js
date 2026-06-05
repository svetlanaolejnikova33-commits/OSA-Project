import { LIGHTING_SHEET_NAME } from "./categoryBridge";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function getSpreadsheetId() {
  return (
    process.env.GOOGLE_SHEETS_REGISTRY_ID ||
    process.env.GOOGLE_SHEETS_ID ||
    ""
  ).trim();
}

function getLightingSheetName() {
  return (process.env.REGISTRY_LIGHTING_SHEET_NAME || LIGHTING_SHEET_NAME).trim();
}

function parseServiceAccountJson() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) return null;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: SHEETS_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const crypto = await import("node:crypto");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Google token error: ${tokenRes.status} ${text}`);
  }

  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

async function fetchSheetViaApi(spreadsheetId, sheetName, accessToken) {
  const range = encodeURIComponent(`'${sheetName}'!A:M`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API error: ${res.status} ${text}`);
  }
  const json = await res.json();
  return Array.isArray(json.values) ? json.values : [];
}

async function fetchSheetViaCsvExport(spreadsheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets CSV export error: ${res.status} ${text}`);
  }
  const csv = await res.text();
  return parseCsv(csv);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  return lines.map(parseCsvLine);
}

/**
 * Read-only fetch of lighting registry tab.
 * @returns {Promise<{ rows: string[][], sheetName: string, source: "api"|"csv" }>}
 */
export async function readLightingSheetRows() {
  const spreadsheetId = getSpreadsheetId();
  const sheetName = getLightingSheetName();
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_REGISTRY_ID is not configured.");
  }

  const serviceAccount = parseServiceAccountJson();
  if (serviceAccount?.client_email && serviceAccount?.private_key) {
    const accessToken = await createGoogleAccessToken(serviceAccount);
    const rows = await fetchSheetViaApi(spreadsheetId, sheetName, accessToken);
    return { rows, sheetName, source: "api" };
  }

  if (process.env.REGISTRY_ALLOW_CSV_FALLBACK === "true") {
    const rows = await fetchSheetViaCsvExport(spreadsheetId, sheetName);
    return { rows, sheetName, source: "csv" };
  }

  throw new Error(
    "Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_JSON or REGISTRY_ALLOW_CSV_FALLBACK=true.",
  );
}
