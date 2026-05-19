"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { mergeHostApplications, type HostApplication } from "@/lib/host-operations";
import {
  mergeReportProjects,
  type ReportProject,
} from "@/lib/report-automation";

type HostOperationsData = {
  applications: HostApplication[];
  isLoading: boolean;
  reportProjects: ReportProject[];
  setApplications: Dispatch<SetStateAction<HostApplication[]>>;
  setReportProjects: Dispatch<SetStateAction<ReportProject[]>>;
};

export function useHostOperationsData(): HostOperationsData {
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [reportProjects, setReportProjects] = useState<ReportProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteState() {
      try {
        const [applicationsResponse, reportsResponse] = await Promise.all([
          fetch("/api/host/applications", { cache: "no-store" }),
          fetch("/api/host/reports", { cache: "no-store" }),
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
    reportProjects,
    setApplications,
    setReportProjects,
  };
}
