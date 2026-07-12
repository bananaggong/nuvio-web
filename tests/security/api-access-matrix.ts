import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const httpMethods = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

export type HttpMethod = (typeof httpMethods)[number];
export type SensitiveApiPolicy = "admin" | "cron" | "host" | "member" | "oauth-callback";

export type ApiRouteMethod = {
  method: HttpMethod;
  route: string;
  sourcePath: string;
  source: string;
};

export type SensitiveApiCase = ApiRouteMethod & {
  policy: SensitiveApiPolicy;
  preAuthStatus?: 404;
  requestPath: string;
};

const apiDirectory = path.resolve(process.cwd(), "src", "app", "api");
const missingUuid = "00000000-0000-4000-8000-000000000001";

export function discoverApiRouteMethods(): ApiRouteMethod[] {
  return listRouteFiles(apiDirectory)
    .flatMap((filePath) => {
      const source = readFileSync(filePath, "utf8");
      const route = toApiRoute(filePath);
      return discoverMethods(source).map((method) => ({
        method,
        route,
        source,
        sourcePath: path.relative(process.cwd(), filePath).replaceAll("\\", "/"),
      }));
    })
    .sort((left, right) =>
      `${left.route}:${left.method}`.localeCompare(`${right.route}:${right.method}`),
    );
}

export function discoverSensitiveApiCases(): SensitiveApiCase[] {
  const discovered = discoverApiRouteMethods()
    .map((routeMethod) => {
      const policy = resolveSensitivePolicy(routeMethod.route, routeMethod.method);
      return policy
        ? {
            ...routeMethod,
            policy,
            ...(isKnownDisabledFeatureRoute(routeMethod.route)
              ? { preAuthStatus: 404 as const }
              : {}),
            requestPath: materializeApiPath(routeMethod.route),
          }
        : null;
    })
    .filter((value): value is SensitiveApiCase => Boolean(value));

  return discovered.sort((left, right) =>
    `${left.requestPath}:${left.method}`.localeCompare(
      `${right.requestPath}:${right.method}`,
    ),
  );
}

function isKnownDisabledFeatureRoute(route: string): boolean {
  return (
    route === "/api/host/reviews/[id]/reply" ||
    route === "/api/host/reviews/[id]/reply/events"
  );
}

export function resolveSensitivePolicy(
  route: string,
  method: HttpMethod,
): SensitiveApiPolicy | null {
  if (route.startsWith("/api/cron/")) return "cron";
  if (route.startsWith("/api/admin/")) return "admin";

  if (route === "/api/host/facebook/callback") return "oauth-callback";
  if (
    (route === "/api/host/villages" || route === "/api/host/channels") &&
    method === "POST"
  ) {
    return "member";
  }
  if (route.startsWith("/api/host/")) return "host";
  if (route.startsWith("/api/me/")) return "member";
  if (route === "/api/program-applications" && method === "POST") return "member";
  if (route === "/api/reviews" && method === "POST") return "member";
  if (
    (route === "/api/reviews/[id]/helpful" ||
      route === "/api/reviews/[id]/reports") &&
    method === "POST"
  ) {
    return "member";
  }

  return null;
}

export function materializeApiPath(route: string): string {
  return route
    .replaceAll("[villageSlug]", "security-e2e-missing")
    .replaceAll("[holdId]", missingUuid)
    .replaceAll("[id]", missingUuid);
}

function discoverMethods(source: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();
  const functionPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)\b/gu;
  for (const match of source.matchAll(functionPattern)) {
    methods.add(match[1] as HttpMethod);
  }

  const reExportPattern = /export\s*\{([\s\S]*?)\}\s*from\s*["'][^"']+["']/gu;
  for (const match of source.matchAll(reExportPattern)) {
    const block = match[1] ?? "";
    for (const method of httpMethods) {
      if (new RegExp(`\\b${method}\\b`, "u").test(block)) methods.add(method);
    }
  }

  return [...methods];
}

function listRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listRouteFiles(entryPath);
    return entry.isFile() && entry.name === "route.ts" ? [entryPath] : [];
  });
}

function toApiRoute(filePath: string): string {
  const relativeDirectory = path.relative(apiDirectory, path.dirname(filePath));
  const suffix = relativeDirectory ? `/${relativeDirectory.replaceAll("\\", "/")}` : "";
  return `/api${suffix}`;
}
