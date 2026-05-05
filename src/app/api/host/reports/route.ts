import { NextResponse } from "next/server";
import {
  listReportProjectsFromDb,
  normalizeReportProject,
  upsertReportProject,
} from "@/lib/report-automation-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const projects = await listReportProjectsFromDb();
    return NextResponse.json({ data: projects });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load report projects.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = normalizeReportProject(body);
    const savedProject = await upsertReportProject(project);

    return NextResponse.json({ data: savedProject }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save report project.",
      },
      { status: 400 },
    );
  }
}
