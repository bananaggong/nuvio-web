# API Access Matrix

This matrix is enforced by `tests/api-access-matrix.test.ts` and the runtime
security E2E suite. Route discovery fails when a new protected API is not
classified.

## Role Matrix

| Policy | Anonymous | Member | Host A | Host B | Admin |
| --- | --- | --- | --- | --- | --- |
| `admin` | `401` | `403` | `403` | `403` | Allowed |
| `host` | `401` | `403` | Role allowed | Role allowed | Allowed |
| `member` | `401` | Allowed | Allowed | Allowed | Allowed |
| `cron` without secret | `401` | `401` | `401` | `401` | `401` |
| OAuth callback with invalid state | Safe same-site redirect | Safe same-site redirect | Safe same-site redirect | Safe same-site redirect | Safe same-site redirect |

Routes behind a launch-disabled feature return `404` before role evaluation so
the unavailable feature is not disclosed. The current example is host review
reply management.

Host role access does not imply tenant access. UUID resources from another
tenant return `404`; explicit channel-slug management attempts return `403`.

## Route Policies

| Policy | Covered routes |
| --- | --- |
| `admin` | `/api/admin/**`, `/api/announcement-sources`, `/api/implementation-status`, `/api/program-leads`, `GET /api/partner-submissions`, and `/api/announcements?refresh=1` |
| `host` | All `/api/host/**` methods except channel creation and the OAuth callback |
| `member` | All `/api/me/**`, `POST /api/program-applications`, `POST /api/reviews`, review helpful/report mutations, and channel creation |
| `cron` | All `/api/cron/**` methods |
| OAuth callback | `GET /api/host/facebook/callback`; state nonce, host role, tenant ownership, and trusted redirect origin are checked separately |

## Tenant And Ownership Invariants

| Resource | Unauthorized principal | Expected result |
| --- | --- | --- |
| Application list/detail/status | Other member or Host B | No row leakage; UUID detail/status returns `404` |
| Participant review update/delete | Member B | `403` without mutation |
| Participant inquiry messages | Member B | `404` without message insertion |
| Host inquiry/messages | Host B | Program scope `403`; UUID mutation `404` |
| Channel settings/board/media | Host B | `403` without mutation |
| Program list/delete | Host B | No row leakage; UUID delete returns `404` |

## Request Boundaries

- State-changing APIs require same-origin evidence, except cron routes protected
  by `CRON_SECRET`.
- JSON routes use bounded readers or explicit content-length checks.
- Multipart routes enforce request-size limits before parsing and validate the
  decoded file signature, dimensions, frame count, and media container.
- TipTap HTML is sanitized at storage and render boundaries.
- OAuth redirects use trusted application origins and relative return paths.
