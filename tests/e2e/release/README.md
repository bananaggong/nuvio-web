# Release E2E

This suite exercises the release-critical participant, host, review, and channel
journeys through the UI and API, then verifies persisted database state.

## Safety

- Use a dedicated local or staging Supabase project. Do not point this suite at
  production.
- Every fixture is prefixed with `NUVIO_E2E_` and global teardown checks that no
  fixture rows remain.
- Remote database writes are disabled unless
  `NUVIO_E2E_ALLOW_REMOTE_DB=1` is set explicitly.
- External email and SMS delivery are disabled for the application server used
  by the suite.

## Run

Provide the normal Supabase server credentials through `.env.local`, then run:

```powershell
$env:NUVIO_E2E_ALLOW_REMOTE_DB = "1"
npm run test:e2e:release
```

The signup journey is strict by default. If the Supabase Auth project has
already exhausted its email-send quota, the suite fails and reports that release
blocker. To continue testing only the downstream journeys during that outage,
opt into the controlled admin-user fallback:

```powershell
$env:NUVIO_E2E_ALLOW_AUTH_RATE_LIMIT_FALLBACK = "1"
npm run test:e2e:release
```

Unset both flags after the run. The fallback does not count as a successful
signup-provider verification.
