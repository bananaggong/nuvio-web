# Production domain

NUVIO production uses `https://nuvio.kr` as the canonical public domain.

## Vercel

Add both domains to the `nuvio-web` Vercel project:

- `nuvio.kr`
- `www.nuvio.kr`

Use `nuvio.kr` as the primary domain and redirect `www.nuvio.kr` to `nuvio.kr` to avoid duplicate SEO URLs.

If DNS is managed outside Vercel, add the records shown in the Vercel project domain settings. Vercel's general guidance is:

- Apex domain: `A` record for `@`
- `www` subdomain: `CNAME` record

Always use the exact values shown by Vercel for this project.

## Supabase Auth

Set the production Site URL:

```txt
https://nuvio.kr
```

Add these Redirect URLs:

```txt
https://nuvio.kr/auth/callback
https://www.nuvio.kr/auth/callback
https://nuvio-web-blue.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

The Vercel URL can remain during the transition, but `https://nuvio.kr/auth/callback` is the canonical production callback.

## Social login providers

Google, Kakao, and Naver provider consoles must keep using the Supabase Auth callback URL:

```txt
https://<supabase-project-ref>.supabase.co/auth/v1/callback
```

The app-level redirect after Supabase login is handled by NUVIO:

```txt
https://nuvio.kr/auth/callback?next=/me
```

## Meta Instagram import

Set the Vercel environment variable:

```txt
FACEBOOK_REDIRECT_URI=https://nuvio.kr/api/host/facebook/callback
```

Add the same URL to the Meta/Facebook app's valid OAuth redirect URIs.
