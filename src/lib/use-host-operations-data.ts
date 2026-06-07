"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  mergeHostApplications,
  readHostApplicationsFromStorage,
  type HostApplication,
} from "@/lib/host-operations";
import {
  mergeReportProjects,
  readReportProjects,
  type ReportProject,
} from "@/lib/report-automation";
import {
  mergeHostProgramDrafts,
  readHostProgramDrafts,
  type HostProgramDraft,
} from "@/lib/host-program-studio";

type HostOperationsData = {
  applications: HostApplication[];
  isLoading: boolean;
  programs: HostProgramDraft[];
  reportProjects: ReportProject[];
  setApplications: Dispatch<SetStateAction<HostApplication[]>>;
  setPrograms: Dispatch<SetStateAction<HostProgramDraft[]>>;
  setReportProjects: Dispatch<SetStateAction<ReportProject[]>>;
};

export function useHostOperationsData(): HostOperationsData {
  const [applications, setApplications] = useState<HostApplication[]>(
    readHostApplicationsFromStorage,
  );
  const [programs, setPrograms] =
    useState<HostProgramDraft[]>(readHostProgramDrafts);
  const [reportProjects, setReportProjects] =
    useState<ReportProject[]>(readReportProjects);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteState() {
      try {
        const [applicationsResponse, reportsResponse, programsResponse] = await Promise.all([
          fetch("/api/host/applications", { cache: "no-store" }),
          fetch("/api/host/reports", { cache: "no-store" }),
          fetch("/api/host/programs", { cache: "no-store" }),
        ]);

        if (applicationsResponse.ok) {
          const payload = (await applicationsResponse.json()) as {
            data?: HostApplication[];
          };
          if (payload.data && !cancelled) {
            setApplications((current) =>
              mergeHostApplications(payload.data ?? [], current),
            );
          }
        }

        if (reportsResponse.ok) {
          const payload = (await reportsResponse.json()) as {
            data?: ReportProject[];
          };
          if (payload.data && !cancelled) {
            setReportProjects((current) =>
              mergeReportProjects(payload.data ?? [], current),
            );
          }
        }

        if (programsResponse.ok) {
          const payload = (await programsResponse.json()) as {
            data?: HostProgramDraft[];
          };
          if (payload.data && !cancelled) {
            setPrograms((current) =>
              mergeHostProgramDrafts(payload.data ?? [], current),
            );
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadRemoteState();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    applications,
    isLoading,
    programs,
    reportProjects,
    setApplications,
    setPrograms,
    setReportProjects,
  };
}
