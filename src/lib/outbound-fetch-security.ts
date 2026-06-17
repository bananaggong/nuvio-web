import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type SafeFetchInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

type SafeFetchOptions = {
  maxRedirects?: number;
};

export async function fetchPublicHttpUrl(
  input: string | URL,
  init: SafeFetchInit = {},
  options: SafeFetchOptions = {},
): Promise<Response> {
  const url = await assertPublicHttpUrl(input);
  const maxRedirects = options.maxRedirects ?? 3;

  return fetchWithCheckedRedirects(url, init, maxRedirects);
}

export async function assertPublicHttpUrl(input: string | URL): Promise<URL> {
  const url = input instanceof URL ? input : new URL(input);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP(S) URLs are allowed.");
  }

  await assertPublicHostname(url.hostname);
  return url;
}

export async function readLimitedResponseText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Remote response is too large.");
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("Remote response is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

async function fetchWithCheckedRedirects(
  url: URL,
  init: SafeFetchInit,
  redirectsLeft: number,
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
  });

  if (!isRedirectResponse(response.status)) return response;

  if (redirectsLeft <= 0) {
    throw new Error("Remote URL redirected too many times.");
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Remote URL redirected without a location.");
  }

  const nextUrl = await assertPublicHttpUrl(new URL(location, url));
  return fetchWithCheckedRedirects(nextUrl, init, redirectsLeft - 1);
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const normalizedHostname = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/u, "")
    .replace(/\]$/u, "");

  if (
    !normalizedHostname ||
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local")
  ) {
    throw new Error("Private or local URLs are not allowed.");
  }

  if (isIP(normalizedHostname)) {
    if (isPrivateIpAddress(normalizedHostname)) {
      throw new Error("Private or local URLs are not allowed.");
    }
    return;
  }

  const addresses = await lookup(normalizedHostname, { all: true });
  if (addresses.length === 0) {
    throw new Error("Remote hostname could not be resolved.");
  }

  if (addresses.some((address) => isPrivateIpAddress(address.address))) {
    throw new Error("Private or local URLs are not allowed.");
  }
}

function isRedirectResponse(status: number): boolean {
  return status >= 300 && status < 400;
}

function isPrivateIpAddress(address: string): boolean {
  const normalizedAddress = address
    .trim()
    .toLowerCase()
    .replace(/^\[/u, "")
    .replace(/\]$/u, "");

  const mappedIpv4 = normalizedAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/u)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);

  if (isIP(normalizedAddress) === 4) return isPrivateIpv4(normalizedAddress);
  if (isIP(normalizedAddress) === 6) return isPrivateIpv6(normalizedAddress);

  return true;
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  return (
    address === "::1" ||
    address === "0:0:0:0:0:0:0:1" ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    address.startsWith("fe80:") ||
    address === "::" ||
    address.startsWith("::")
  );
}
