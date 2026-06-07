import { redirect } from "next/navigation";
import { getHostConsoleOverview } from "@/lib/host-village-access";

export type HostRouteSearchParams = Record<
  string,
  string | string[] | undefined
>;

export async function requireHostConsoleAccess(nextPath: string) {
  const overview = await getHostConsoleOverview();

  if (!overview.signedIn) {
    redirect(`/login?intent=host&next=${encodeURIComponent(nextPath)}`);
  }

  if (overview.workspaces.length === 0) {
    redirect("/host");
  }

  return overview;
}

export function buildHostRouteNextPath(
  pathname: string,
  searchParams?: HostRouteSearchParams,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
