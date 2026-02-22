export type InactivePerson = {
  nominativo: string;
  pv: number | null;
  ultimoContratto: string | null;
  attivazioneNetworker: string | null;
};

type WorkerResponse = {
  count: number;
  items: InactivePerson[];
};

export async function fetchInattivi(): Promise<WorkerResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SHEETS_WORKER_URL;
  const apiKey = process.env.NEXT_PUBLIC_SHEETS_API_KEY;

  if (!baseUrl) throw new Error("Missing env: NEXT_PUBLIC_SHEETS_WORKER_URL");
  if (!apiKey) throw new Error("Missing env: NEXT_PUBLIC_SHEETS_API_KEY");

//  const res = await fetch(`${baseUrl}/api/inattivi`, {
//    headers: {
//      "x-api-key": apiKey,
//    },
//    cache: "no-store",
//  });

 const url = `${baseUrl}/api/inattivi`;

 // retry 2 volte su errori di rete
  const attempts = 3;
  let lastErr: any;

  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000); // 12s timeout

    try {
      const res = await fetch(url, {
          headers: {
          "x-api-key": apiKey,
          },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Worker error ${res.status}: ${text}`);
      }


      return res.json();
    } catch (e: any) {
      lastErr = e;

      // abort/ERR_FAILED/Failed to fetch: retry
      const msg = String(e?.message ?? e);
      const shouldRetry =
        e?.name === "AbortError" ||
        msg.includes("Failed to fetch") ||
        msg.includes("ERR_FAILED") ||
        msg.includes("NetworkError");

      if (!shouldRetry || i === attempts - 1) break;

      // backoff leggero
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr ?? new Error("Failed to fetch");
}
