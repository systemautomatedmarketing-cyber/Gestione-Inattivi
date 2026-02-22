import { NextResponse } from "next/server";

const WORKER_BASE = "https://sheets-proxy.systemautomatedmarketing.workers.dev";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sheet = searchParams.get("sheet") ?? "";

  if (!sheet) {
    return NextResponse.json({ error: "Missing sheet parameter" }, { status: 400 });
  }

console.log("NEXT_PUBLIC_SHEETS_API_KEY present?", !!process.env.NEXT_PUBLIC_SHEETS_API_KEY);

//const apiKey = process.env.WORKER_API_KEY;
//const apiKey = process.env.INTERNAL_API_KEY;
const apiKey = process.env.NEXT_PUBLIC_SHEETS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "WORKER_API_KEY missing on Next server (.env.local)" },
      { status: 500 }
    );
  }

  // server-to-server: niente CORS
  const url = `${WORKER_BASE}/api/inattivi?sheet=${encodeURIComponent(sheet)}`;
//  const resp = await fetch(url, { cache: "no-store" });

  const resp = await fetch(url, {
    cache: "no-store",
    headers: {
      "x-api-key": apiKey },
  });

  const text = await resp.text();
  if (!resp.ok) {
//    return NextResponse.json(
//      { error: "Worker error", status: resp.status, details: text },
//      { status: 500 }
//    );

    return new NextResponse(text, {
      status: resp.status,
      headers: { "Content-Type": resp.headers.get("content-type") ?? "text/plain" },
    });
  }

  return new NextResponse(text, {
    status: 200,
    headers: { "Content-Type": resp.headers.get("content-type") ?? "application/json" },
  });

  // il worker potrebbe restituire già JSON
//  let data: any;
//  try { data = JSON.parse(text); } catch { data = text; }

//  return NextResponse.json(data, { status: 200 });
  // ✅ ritorna SEMPRE quello che arriva (così vediamo l'errore reale)
//  return new NextResponse(text, {
//    status: resp.status,
//    headers: { "Content-Type": resp.headers.get("content-type") ?? "text/plain" },
//  });
}
