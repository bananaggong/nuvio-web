# NUVIO mobile responsive route audit

Updated: 2026-07-11

This checklist is the source of truth for the responsive pass. It was generated
from the 90 current `src/app/**/page.tsx` entries after legacy static aliases
were moved to `next.config.ts` redirects.

## Shared shells

| Shell | Route ownership | Shared responsive owners |
| --- | --- | --- |
| Public chrome | General public pages | `AppShell`, `SiteHeader`, `Footer`, `MobileTabBar` |
| Auth chrome | Login, signup, onboarding | `AppShell` with site chrome hidden, auth panel header/card |
| Channel microsite | Public channel routes | `AppShell` chrome hidden, `VillageSiteHeader`/`VillageSiteFooter` or channel guest chrome |
| Mypage | `/mypage/*`, support | Public chrome plus `Mypage`/`MypageFrame` |
| Host console | `/host/*` | `OpsConsoleShell`, host workspace/sidebar components |
| Admin console | `/admin/magazine/*` | `OpsConsoleShell`, magazine editor/list |

Status values: `pass-1` completed responsive implementation and route-specific
checks, `bridge` is a redirect/compatibility route, `deferred` is intentionally
excluded from the current pass, `feature` is disabled by a launch flag, and
`auth` requires a signed-in role for browser verification.

## Public core routes (19)

| Route | Shell | Primary implementation | Status |
| --- | --- | --- | --- |
| `/` | Public chrome | `ProgramExplorer` | pass-1 |
| `/search` | Public chrome | `SearchPage` | pass-1 |
| `/support` | Mypage | `Mypage` support view | pass-1 |
| `/terms` | Public chrome | `LegalDocumentPage` | pass-1 |
| `/privacy` | Public chrome | `LegalDocumentPage` | pass-1 |
| `/privacy/third-party` | Public chrome | `LegalDocumentPage` | pass-1 |
| `/partners/apply` | Public chrome | `PartnerForm` | pass-1 |
| `/signup` | Auth chrome | `SignupPanel` | pass-1 |
| `/login` | Auth chrome | login card/page | pass-1 |
| `/onboarding` | Auth chrome | `OnboardingPanel` | pass-1/auth |
| `/half-price-travel` | Public chrome | `ProgramCard` collection | pass-1 |
| `/reviews` | Public chrome | `ReviewFeed` | pass-1 |
| `/reviews/new` | Public chrome | `ReviewWriter` | pass-1/auth |
| `/magazine` | Public chrome | magazine index | pass-1 |
| `/magazine/[slug]` | Public chrome | magazine article/content renderer | pass-1 |
| `/announcements` | Public chrome | announcement index | pass-1 |
| `/announcements/[id]` | Public chrome | announcement detail | pass-1 |
| `/programs/[id]` | Public chrome | program detail components | pass-1 |
| `/programs/[id]/apply` | Public chrome | `ProgramApplicationForm` | pass-1 |

## Public channel routes (25)

| Route | Shell | Primary implementation | Status |
| --- | --- | --- | --- |
| `/[villageSlug]` | Channel microsite | `VillageHomePage` (`BoseongFigmaHomePage` or `ChannelGuestHomePage`) | pass-1/general; deferred/boseong |
| `/[villageSlug]/[programSlug]` | Channel microsite | DB-backed canonical program redirect | bridge |
| `/[villageSlug]/about` | Channel microsite | `VillageAboutIndexPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/media` | Channel microsite | `VillageMediaIndexPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/media/[mediaId]` | Channel microsite | `VillageMediaDetailPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/notice` | Channel microsite | `VillageNoticeIndexPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/notice/[postId]` | Channel microsite | `ChannelGuestBoardDetailPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/reviews` | Channel microsite | `VillageReviewsIndexPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/reviews/[reviewId]` | Channel microsite | `VillageReviewDetailPage` | deferred/boseong |
| `/[villageSlug]/programs` | Channel microsite | `VillageProgramsIndexPage` | pass-1/general; deferred/boseong |
| `/[villageSlug]/terms` | Channel microsite | `VillageLegalPage` | pass-1/general |
| `/[villageSlug]/privacy` | Channel microsite | `VillageLegalPage` | pass-1/general |
| `/[villageSlug]/privacy/third-party` | Channel microsite | `VillageLegalPage` | pass-1/general |
| `/channels` | Public chrome | public channel directory | pass-1/general; deferred/boseong asset |
| `/channels/[slug]` | Channel microsite | wrapper for `/villages/[slug]` | pass-1/general; deferred/boseong |
| `/channels/[slug]/about` | Channel microsite | wrapper for village about | pass-1/general; deferred/boseong |
| `/channels/[slug]/media` | Channel microsite | wrapper for village media index | pass-1/general; deferred/boseong |
| `/channels/[slug]/media/[mediaId]` | Channel microsite | wrapper for village media detail | pass-1/general; deferred/boseong |
| `/channels/[slug]/notice` | Channel microsite | wrapper for village notice index | pass-1/general; deferred/boseong |
| `/channels/[slug]/notice/[postId]` | Channel microsite | wrapper for village notice detail | pass-1/general; deferred/boseong |
| `/channels/[slug]/programs` | Channel microsite | wrapper for village programs | pass-1/general; deferred/boseong |
| `/channels/[slug]/programs/[programSlug]` | Channel microsite | canonical program redirect bridge | bridge |
| `/channels/[slug]/reviews` | Channel microsite | wrapper for village reviews | pass-1/general; deferred/boseong |
| `/villages/[slug]` | Channel microsite | canonical `VillageHomePage` implementation | pass-1/general; deferred/boseong |
| `/villages/[slug]/programs/[programSlug]` | Channel microsite | canonical program redirect bridge | bridge |

## Mypage routes (10)

| Route | Shell | Primary implementation | Status |
| --- | --- | --- | --- |
| `/mypage` | Mypage | `Mypage` home view | pass-1/auth |
| `/mypage/trips` | Mypage | `Mypage` trips view | pass-1/auth |
| `/mypage/reviews` | Mypage | `Mypage` reviews view | pass-1/auth |
| `/mypage/bookmarks` | Mypage | `Mypage` bookmarks view | pass-1/auth |
| `/mypage/messages` | Mypage | `Mypage` messages view | pass-1/auth |
| `/mypage/member-information` | Mypage | `Mypage` member view | pass-1/auth |
| `/mypage/points` | Mypage | `Mypage` points view | pass-1/auth |
| `/mypage/coupons` | Mypage | feature-flagged coupons view | deferred/feature |
| `/mypage/settings` | Mypage | `Mypage` settings view | pass-1/auth |
| `/support` | Mypage | shared support view (also listed in public core) | pass-1 |

`/support` is one physical route and is intentionally referenced in both the
public and Mypage functional groups; the total unique page count remains 94.

## Host routes (33)

| Route | Shell | Primary implementation | Status |
| --- | --- | --- | --- |
| `/host` | Host console | `HostCenterHome`/channel creation | pass-1/auth |
| `/host/messages` | Host console | `HostMessageInbox` | pass-1/auth |
| `/host/forms` | Host console | `HostFormLibrary` | pass-1/auth |
| `/host/forms/[formId]` | Host console | `HostFormBuilder` | pass-1/auth |
| `/host/settings` | Host console | host notification/team settings | pass-1/auth |
| `/host/applications` | Host console | `HostApplicationsCrm` | pass-1/auth |
| `/host/applications/[id]` | Host console | legacy application resolver | bridge/auth |
| `/host/channels` | Host console | `HostChannelHome` | pass-1/auth |
| `/host/channels/settings` | Host console | `HostChannelMenuSettings` | pass-1/auth |
| `/host/channels/[section]` | Host console | channel programs/reviews/gallery/magazine/board/settings | pass-1/auth |
| `/host/villages/[villageSlug]` | Host console | access guard to `/host/channels` | bridge/auth |
| `/host/villages/[villageSlug]/editor` | Host console | access guard to channel editor | bridge/auth |
| `/host/projects/new` | Host console | `HostProjectCreateWizard` | pass-1/auth |
| `/host/projects/[projectId]` | Host console | `HostProjectHub` | pass-1/auth |
| `/host/projects/[projectId]/activities` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/closeout` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/evidence` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/messages` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/forms` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/applications` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/applications/[applicationId]` | Host console | project hub redirect | bridge/auth |
| `/host/projects/[projectId]/programs/new` | Host console | `HostProgramCreateWizard` | pass-1/auth |
| `/host/projects/[projectId]/programs/[programId]` | Host console | `HostProgramHub` | pass-1/auth |
| `/host/projects/[projectId]/programs/[programId]/messages` | Host console | `HostMessageAutomation` | pass-1/auth |
| `/host/projects/[projectId]/programs/[programId]/forms` | Host console | `HostProgramFormAttachment` | pass-1/auth |
| `/host/projects/[projectId]/programs/[programId]/applications` | Host console | `HostApplicationsCrm` | pass-1/auth |
| `/host/projects/[projectId]/programs/[programId]/applications/[applicationId]` | Host console | `HostApplicationDetail` | pass-1/auth |
| `/host/programs/new` | Host console | `HostProgramCreateWizard` | pass-1/auth |
| `/host/programs/[programId]` | Host console | `HostProgramHub` | pass-1/auth |
| `/host/programs/[programId]/messages` | Host console | `HostMessageAutomation` | pass-1/auth |
| `/host/programs/[programId]/forms` | Host console | `HostProgramFormAttachment` | pass-1/auth |
| `/host/programs/[programId]/applications` | Host console | `HostApplicationsCrm` | pass-1/auth |
| `/host/programs/[programId]/applications/[applicationId]` | Host console | `HostApplicationDetail` | pass-1/auth |

## Admin routes (4)

| Route | Shell | Primary implementation | Status |
| --- | --- | --- | --- |
| `/admin` | Admin console | redirect to `/admin/magazine` | bridge/auth |
| `/admin/magazine` | Admin console | `AdminMagazineList` | pass-1/auth |
| `/admin/magazine/new` | Admin console | `AdminMagazineEditor` | pass-1/auth |
| `/admin/magazine/[id]/edit` | Admin console | `AdminMagazineEditor` | pass-1/auth |

## Required viewport matrix

- Mobile: `320x568`, `360x800`, `390x844`, `430x932`
- Tablet: `768x1024`
- Landscape: `844x390`
- Desktop regression: `1280x800`, `1440x900`, `1920x1080`

## Verification contract

For each completed functional group:

1. Verify document-level horizontal overflow at every required viewport.
2. Inspect the first viewport, long-content state, and interactive state visually.
3. Check console/hydration errors and mobile input font sizes.
4. Run route-specific `verify:overflow` with `NUVIO_VERIFY_VIEWPORTS`.
5. Run `verify:host-program-flow` after host program changes.
6. Finish the work unit with lint, build, `git diff --check`, commit, and push.

## Final verification snapshot

- Physical route count: 94 `src/app/**/page.tsx` files.
- Viewport matrix: `320x568`, `360x800`, `390x844`, `430x932`,
  `768x1024`, `844x390`, `1280x800`, `1440x900`, and `1920x1080`.
- Public, auth, magazine, announcement, review, legal, general channel, Mypage,
  host, channel-management, and admin templates completed document-overflow and
  representative visual checks.
- Host and admin checks used local development role authentication only; no
  production authentication or authorization behavior was changed.
- Boseong-specific screens, content, data, and assets were explicitly deferred
  by request. Shared shell changes were checked without editing Boseong-owned
  source files.
- `/mypage/coupons` remains deferred because the launch feature is disabled.
- Bridge routes retain compatibility behavior and resolve to their canonical
  implementation instead of maintaining a second responsive UI.
