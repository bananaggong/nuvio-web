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
  updatedAt: "2026-05-06",
  groups: [
    {
      title: "Public Program Experience",
      items: [
        {
          title: "Crawler-first public program feed",
          state: "implemented",
          summary:
            "Home and /api/programs now prioritize official RSS announcement candidates before DB-published programs, with seed data only as an empty-state fallback.",
          routes: [
            { label: "Home", href: "/" },
            { label: "Programs API", href: "/api/programs" },
            { label: "Announcements API", href: "/api/announcements" },
          ],
          verification:
            "Refresh /api/announcements, then confirm external candidates marked as official-source data appear on the home list.",
        },
        {
          title: "Supabase-backed program listing",
          state: "implemented",
          summary:
            "Published rows in Supabase programs are merged after crawled candidates and ahead of seed fallback on the home page and public API.",
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
        {
          title: "Channel home pages and path-first routing",
          state: "implemented",
          summary:
            "Each channel can have a public homepage, short path alias, canonical /channels route, and channel-scoped program detail route.",
          routes: [
            { label: "Channel directory", href: "/channels" },
            { label: "Short channel URL", href: "/boseong" },
            {
              label: "Channel program URL",
              href: "/gangneung-wave/gangneung-wave-workation",
            },
          ],
          verification:
            "Open /channels, /boseong, and a channel program path, then confirm the page resolves from seed or Supabase data.",
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
            "Attach a form to a program in /host/forms, then open that program's apply page and submit a test application.",
        },
        {
          title: "Supabase application persistence",
          state: "implemented",
          summary:
            "Applications are persisted to program_applications with form_id when a program form is attached.",
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
            "After Supabase provider setup, click each social login and confirm redirect back to /mypage.",
        },
        {
          title: "My page session and DB applications",
          state: "implemented",
          summary:
            "My Page reads the Supabase session/profile and combines DB applications for the signed-in email.",
          routes: [{ label: "Mypage", href: "/mypage" }],
          verification:
            "Sign in, submit an application with the same email, then check /mypage.",
        },
      ],
    },
    {
      title: "Host and Admin Operations",
      items: [
        {
          title: "Unified host access",
          state: "ready_for_verification",
          summary:
            "Host screens are available to any authenticated account, while admin routes remain restricted.",
          routes: [
            { label: "Host console", href: "/host" },
            { label: "Program studio", href: "/host/programs" },
          ],
          verification:
            "Sign in with a regular user account and confirm host screens and APIs load.",
        },
        {
          title: "Host channel studio",
          state: "implemented",
          summary:
            "Hosts can draft, preview, publish, and persist channel home data including slug, program links, and contact channels.",
          routes: [
            { label: "Channel studio", href: "/host/villages" },
            { label: "Channels API", href: "/api/host/channels" },
          ],
          verification:
            "Create or edit a channel, save it to Supabase, then confirm it appears on the public channel route.",
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
            "Announcement APIs refresh stale RSS data on demand, Vercel Cron provides a daily backup refresh, and scored program leads are persisted.",
          routes: [
            { label: "Cron API", href: "/api/cron/refresh-announcements" },
            { label: "Sources API", href: "/api/announcement-sources" },
            { label: "Announcements API", href: "/api/announcements" },
            { label: "Admin", href: "/admin" },
          ],
          verification:
            "Confirm /api/announcement-sources shows lastFetchedAt and item counts after calling /api/announcements or the protected cron endpoint.",
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
