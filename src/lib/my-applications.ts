import type { HostApplication } from "./host-operations";

export const MY_APPLICATION_STORAGE_KEY = "nuvio:my-applications";

export function readMyApplicationsFromStorage(): HostApplication[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(
      window.localStorage.getItem(MY_APPLICATION_STORAGE_KEY) ?? "[]",
    ) as HostApplication[];
  } catch {
    return [];
  }
}

export function appendMyApplication(application: HostApplication): HostApplication[] {
  const applications = readMyApplicationsFromStorage();
  const next = [application, ...applications.filter((item) => item.id !== application.id)];
  window.localStorage.setItem(MY_APPLICATION_STORAGE_KEY, JSON.stringify(next));
  return next;
}
