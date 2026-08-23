import { buildDsHeader } from "./ds";

export class HoyolabApiError extends Error {
  constructor(
    public retcode: number,
    message: string,
    public endpoint: string,
  ) {
    super(`[${endpoint}] HoYoLAB retcode ${retcode}: ${message}`);
    this.name = "HoyolabApiError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

function baseHeaders(): Record<string, string> {
  const ltuid = requireEnv("HOYOLAB_LTUID");
  const ltoken = requireEnv("HOYOLAB_LTOKEN");

  return {
    DS: buildDsHeader(),
    Cookie: `ltuid_v2=${ltuid}; ltoken_v2=${ltoken};`,
    "x-rpc-client_type": "5",
    "x-rpc-app_version": "2.34.1",
    "x-rpc-language": "en-us",
    "x-rpc-lang": "en-us",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
  };
}

interface RequestOptions {
  method?: "GET" | "POST";
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
}

function buildQuery(params?: RequestOptions["params"]): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Fires a signed request against a HoYoLAB Battle Chronicle endpoint and returns
 * the `data` payload. Every call gets a fresh DS header (they're single-use, ~2min TTL).
 */
export async function hoyolabRequest<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", params, body } = options;
  const fullUrl = `${url}${buildQuery(params)}`;

  const headers = baseHeaders();
  if (method === "POST") headers["Content-Type"] = "application/json";

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(body ?? params ?? {}) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${fullUrl}`);
  }

  const json = (await res.json()) as {
    retcode: number;
    message: string;
    data: T;
  };

  if (json.retcode !== 0) {
    throw new HoyolabApiError(json.retcode, json.message, fullUrl);
  }

  return json.data;
}
