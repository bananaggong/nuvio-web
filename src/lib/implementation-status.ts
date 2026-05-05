export type ImplementationState =
  | "implemented"
  | "manual_setup_required"
  | "ready_for_verification";

export type ImplementationStatusItem = {
  title: string;
  state: ImplementationState;
  summary: string;
  routes: Array<{ label: string; href: string }>;
  verification: string;
};

export type ImplementationStatusGroup = {
  title: string;
  items: ImplementationStatusItem[];
};

export const implementationStatus: {
  updatedAt: string;
  groups: ImplementationStatusGroup[];
} = {
  updatedAt: "2026-05-05",
  groups: [
    {
      title: "Public Program Experience",
      items: [
        {
          title: "Supabase-backed program listing",
          state: "implemented",
          summary:
            "Published rows in Supabase programs are merged ahead of seed data on the home page and public API.",
          routes: [
            { label: "Home", href: "/" },
            { label: "Programs API", href: "/api/programs" },
          ],
          verification:
            "Create or publish a host program, then confirm it appears on the home list and /api/programs.",
        },
        {
          title: "Dynamic program detail and apply routes",
          state: "implemented",
          summary:
            "Program detail and application pages resolve by legacy id, slug, or Supabase record id.",
          routes: [
            { label: "Seed detail", href: "/programs/1001" },
            { label: "Seed apply", href: "/programs/1001/apply" },
          ],
          verification:
            "Open a DB-published program slug from /host/programs after publishing it.",
        },
      ],
    },
    {
      title: "Application Pipeline",
      items: [
        {
          title: "Host form templates on public apply page",
          state: "implemented",
          summary:
            "Application pages load matching host-built form templates and submit template answers with form_id.",
          routes: [
            { label: "Host forms", href: "/host/forms" },
            { label: "Apply example", href: "/programs/1001/apply" },
          ],
          verification:
            "Create a form for a program title, then open that program's apply page and submit a test application.",
        },
        {
          title: "Supabase application persistence",
          state: "implemented",
          summary:
            "Applications are persisted to program_applications and mirrored to local storage as a fallback.",
          routes: [
            { label: "Host applications", href: "/host" },
            { label: "Applications API", href: "/api/host/applications" },
          ],
          verification:
            "Submit an application and confirm it appears in /host plus the applications API.",
        },
      ],
    },
    {
      title: "Auth and Account",
      items: [
        {
          title: "Supabase social login APIs",
          state: "manual_setup_required",
          summary:
            "Google, Kakao, and Naver OAuth entry points are implemented; provider credentials still must be enabled in Supabase.",
          routes: [
            { label: "Login", href: "/login" },
            { label: "Providers API", href: "/api/auth/providers" },
            { label: "Session API", href: "/api/auth/session" },
          ],
          verification:
            "After Supabase provider setup, click each social login and confirm redirect back to /me.",
        },
        {
          title: "My page session and DB applications",
          state: "implemented",
          summary:
            "My Page reads the Supabase session/profile and combines DB applications for the signed-in email.",
          routes: [{ label: "My Page", href: "/me" }],
          verification:
            "Sign in, submit an application with the same email, then check /me.",
        },
      ],
    },
    {
      title: "Host and Admin Operations",
      items: [
        {
          title: "Host role visibility",
          state: "ready_for_verification",
          summary:
            "Host screens show the current account role from the Supabase profile so partner/admin access can be verified.",
          routes: [
            { label: "Host console", href: "/host" },
            { label: "Program studio", href: "/host/programs" },
          ],
          verification:
            "Promote the profile role to partner or admin in Supabase and refresh host screens.",
        },
        {
          title: "External lead approval to program draft",
          state: "implemented",
          summary:
            "Admin lead approval persists the decision and creates a host program draft in Supabase.",
          routes: [
            { label: "Admin", href: "/admin" },
            { label: "Leads API", href: "/api/program-leads" },
            { label: "Program studio", href: "/host/programs" },
          ],
          verification:
            "Approve a lead in /admin, then confirm a new draft appears in /host/programs.",
        },
        {
          title: "Cron-backed external announcement ingestion",
          state: "implemented",
          summary:
            "Vercel Cron refreshes external RSS sources every 15 minutes, stores announcements, and persists scored program leads.",
          routes: [
            { label: "Cron API", href: "/api/cron/refresh-announcements" },
            { label: "Sources API", href: "/api/announcement-sources" },
            { label: "Announcements API", href: "/api/announcements" },
            { label: "Admin", href: "/admin" },
          ],
          verification:
            "Check CRON_SECRET in Vercel env, then confirm /api/announcement-sources shows lastFetchedAt and item counts after deployment.",
        },
      ],
    },
  ],
};

export function summarizeImplementationStatus() {
  const items = implementationStatus.groups.flatMap((group) => group.items);

  return {
    total: items.length,
    implemented: items.filter((item) => item.state === "implemented").length,
    readyForVerification: items.filter(
      (item) => item.state === "ready_for_verification",
    ).length,
    manualSetupRequired: items.filter(
      (item) => item.state === "manual_setup_required",
    ).length,
  };
}
