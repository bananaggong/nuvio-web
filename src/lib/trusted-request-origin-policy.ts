type TrustedOriginEnvironment = {
  NODE_ENV?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
};

export function resolveTrustedRequestOrigin(
  requestUrl: URL,
  canonicalOrigin: string,
  environment: TrustedOriginEnvironment,
): string {
  if (environment.NODE_ENV !== "production" && isLoopbackHost(requestUrl.hostname)) {
    return requestUrl.origin;
  }

  if (
    environment.VERCEL_ENV === "preview" &&
    requestUrl.protocol === "https:" &&
    getPreviewHosts(environment).has(requestUrl.host.toLowerCase())
  ) {
    return requestUrl.origin;
  }

  return canonicalOrigin;
}

function getPreviewHosts(environment: TrustedOriginEnvironment): Set<string> {
  const hosts = new Set<string>();

  for (const value of [environment.VERCEL_URL, environment.VERCEL_BRANCH_URL]) {
    const host = parseVercelHost(value);
    if (host) hosts.add(host);
  }

  return hosts;
}

function parseVercelHost(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  try {
    const url = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/u, "")
    .replace(/\]$/u, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
