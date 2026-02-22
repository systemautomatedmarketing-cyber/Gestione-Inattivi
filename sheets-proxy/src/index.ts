/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  GSA_CLIENT_EMAIL: string;     // secret
  GSA_PRIVATE_KEY: string;      // secret
  INTERNAL_API_KEY: string; // ✅ aggiungi
  SPREADSHEET_ID: string;       // var
  SHEET_NAME: string;           // var
}

type SheetRow = string[];

type InactivePerson = {
  rowIndex: number;
  nominativo: string;
  pv: number | null;
  ultimoContratto: string | null;
  attivazioneNetworker: string | null;
};

function base64UrlEncode(input: ArrayBuffer | string) {
  const str = typeof input === "string" ? input : String.fromCharCode(...new Uint8Array(input));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signRS256(message: string, privateKeyPem: string): Promise<string> {

  // Convert PEM -> ArrayBuffer
  const pem = privateKeyPem
    .replace(/\\n/g, "\n") // se la key arriva escape-ata
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");

  const binary = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binary.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(message));
  return base64UrlEncode(sig);
}

async function getGoogleAccessToken(env: Env): Promise<string> {
  if (!env.GSA_CLIENT_EMAIL || !env.GSA_PRIVATE_KEY) {
    throw new Error("Missing secrets: GSA_CLIENT_EMAIL / GSA_PRIVATE_KEY");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const claimSet = {
    iss: env.GSA_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
  };


  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaim}`;
  const signature = await signRS256(unsignedJwt, env.GSA_PRIVATE_KEY);
  const jwt = `${unsignedJwt}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

console.log ("resp.ok = ", resp.ok);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

function normalizeHeader(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, ""); // rimuove accenti
}

function indexOfHeader(headers: string[], name: string): number {
  const target = normalizeHeader(name);
  const normalized = headers.map(normalizeHeader);
  return normalized.indexOf(target);
}

function toNumberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const v = value.trim().replace(",", "."); // se mai ci fosse virgola
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStringOrNull(value: string | undefined): string | null {
  const v = (value || "").trim();
  return v.length ? v : null;
}

function corsHeaders(origin: string | null) {
  // In dev: lascia libero. In prod potrai restringere.
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    "Access-Control-Max-Age": "86400",
  };
}

function withCors(resp: Response, origin: string | null) {
  const headers = new Headers(resp.headers);
  const cors = corsHeaders(origin);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  });
}

function json(data: unknown, status = 200, origin: string | null = null) {
//  return new Response(JSON.stringify(data), {
//    status,
//    headers: {
//      "Content-Type": "application/json",
//      ...corsHeaders(origin),
//    },
//  });

  const resp = new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", },
  });
  return withCors(resp, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    // ✅ Preflight CORS
    if (request.method === "OPTIONS") {
//      return new Response(null, {
//        status: 204,
//        headers: corsHeaders(origin),
//      });
      return withCors(new Response(null, { status: 204 }), origin);
    }
    
    try {

      // 🔐 PROTEZIONE
      const apiKey = request.headers.get("x-api-key");

      if (!apiKey || apiKey !== env.INTERNAL_API_KEY) {
//        return json(
//          { error: "Unauthorized" },
//          401
//        );
        return json(
          { error: "Unauthorized" },
          401, 
          origin
        );
      }

      // Validazione vars
      if (!env.SPREADSHEET_ID || !env.SHEET_NAME) {
        return json(
          {
            error: "Missing vars: SPREADSHEET_ID / SHEET_NAME",
            hasSpreadsheetId: !!env.SPREADSHEET_ID,
            hasSheetName: !!env.SHEET_NAME,
          },
//          500
          500,
          origin
        );
      }

      const url = new URL(request.url);

console.log(request.url);

      // endpoint: /api/inattivi
      if (url.pathname !== "/api/inattivi") {
//        return json({ error: "Not Found" }, 404);
        return json({ error: "Not Found" }, 404, origin);
      }

      const token = await getGoogleAccessToken(env);

      // ✅ sheetName: se arriva da query usalo, altrimenti fallback env.SHEET_NAME
      const requestedSheet = url.searchParams.get("sheet");
      const sheetName = (requestedSheet && requestedSheet.trim().length)
        ? requestedSheet.trim()
        : env.SHEET_NAME;

      // Leggiamo l'intero range della tab (semplice).
      // Puoi restringere: e.g. `${env.SHEET_NAME}!A:Z`

      const safeSheetName = sheetName.replace(/'/g, "''");
      const range = encodeURIComponent(`'${safeSheetName}'!A:G`);

      console.log("CONFIG CHECK", {
        spreadsheet: !!env.SPREADSHEET_ID,
        sheet: sheetName ?? null
      });

      // valueRenderOption=FORMATTED_VALUE -> date come "03/11/2025"
      const sheetsUrl =
        `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${range}` +
        `?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;

console.log("sheetsUrl = ", sheetsUrl);

      const resp = await fetch(sheetsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

console.log("resp.ok = ", resp.ok);

      if (!resp.ok) {
        const text = await resp.text();
//        return json({ error: "Sheets fetch failed", details: text }, 500);
        return json({ error: "Sheets fetch failed", details: text }, 500, origin);

      }

      const data = (await resp.json()) as { values?: SheetRow[] };
      const values = data.values || [];

console.log("data = ", data);

     // Se non ci sono righe o manca intestazione
      if (values.length < 2) {
//        return json({ count: 0, items: [] });
        return json({ count: 0, items: [] }, 200, origin);
      }

      const headers = values[0];

console.log("headers = ", headers);

  // Colonne reali del tuo foglio
      const idxNominativo = indexOfHeader(headers, "Nominativo");
      const idxPV = indexOfHeader(headers, "PV");
      const idxUltimoContratto = indexOfHeader(headers, "Ultimo contratto");
      const idxAttivazione = indexOfHeader(headers, "Attivazione networker");

      // Se manca una colonna, falliamo con errore chiaro
      const missing: string[] = [];
      if (idxNominativo < 0) missing.push("Nominativo");
      if (idxPV < 0) missing.push("PV");
      if (idxUltimoContratto < 0) missing.push("Ultimo contratto");
      if (idxAttivazione < 0) missing.push("Attivazione networker");

      if (missing.length) {
        return json(
          {
            error: "Header mismatch: colonne non trovate",
            missing,
            headersFound: headers,
            hint: "Controlla che la prima riga del foglio contenga esattamente questi titoli.",
          },
//          500
          500,
          origin
        );
      }      
      
      const items: InactivePerson[] = [];

      for (let r = 1; r < values.length; r++) {
        const row = values[r];

        const nominativo = (row[idxNominativo] || "").trim();
        if (!nominativo) continue; // salta righe vuote

        const rowIndex = r + 1;

        items.push({
          rowIndex,
          nominativo,
          pv: toNumberOrNull(row[idxPV]),
          ultimoContratto: toStringOrNull(row[idxUltimoContratto]),
          attivazioneNetworker: toStringOrNull(row[idxAttivazione]),
        });
      }
        

      return json({
        count: items.length,
        items
      }, 200, origin);
    } catch (err: any) {
//      return json({ error: err?.message || "Unknown error" }, 500);
      return json({ error: err?.message || "Unknown error" }, 500, origin);
    }
  },
};
