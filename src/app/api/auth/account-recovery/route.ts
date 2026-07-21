import { after, NextResponse } from "next/server";
import {
  buildAccountRecoveryLoginPath,
  deliverAccountRecoveryEmail,
  parseAccountRecoveryRequest,
} from "@/lib/account-recovery";
import {
  apiError,
  applyPersistentRateLimit,
  enforceSameOrigin,
  readJsonWithLimit,
} from "@/lib/api-security";
import { getTrustedRequestOrigin } from "@/lib/trusted-request-origin";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 4 * 1024;
const IP_RATE_LIMIT = {
  failureMode: "deny" as const,
  key: "account-recovery:ip",
  limit: 5,
  windowMs: 60 * 60 * 1000,
};
const EMAIL_RATE_LIMIT = {
  failureMode: "deny" as const,
  key: "account-recovery:email",
  limit: 3,
  windowMs: 24 * 60 * 60 * 1000,
};
const PRIVATE_NO_STORE = "private, no-store, max-age=0";

export async function POST(request: Request) {
  const crossOrigin = enforceSameOrigin(request);
  if (crossOrigin) return withPrivateNoStore(crossOrigin);

  const parsedBody = await readJsonWithLimit(request, MAX_PAYLOAD_BYTES);
  if (parsedBody.response) return withPrivateNoStore(parsedBody.response);

  const validation = parseAccountRecoveryRequest(parsedBody.body);
  if ("error" in validation) {
    return withPrivateNoStore(apiError(validation.error, 400));
  }

  const ipLimited = await applyPersistentRateLimit(request, IP_RATE_LIMIT);
  if (ipLimited) return withPrivateNoStore(ipLimited);

  const emailLimited = await applyPersistentRateLimit(request, {
    ...EMAIL_RATE_LIMIT,
    identity: validation.values.email,
  });
  if (emailLimited) return withPrivateNoStore(emailLimited);

  const loginPath = buildAccountRecoveryLoginPath(validation.values);
  const loginUrl = new URL(
    loginPath,
    getTrustedRequestOrigin(new URL(request.url)),
  ).toString();

  after(async () => {
    try {
      await deliverAccountRecoveryEmail({
        ...validation.values,
        loginUrl,
      });
    } catch {
      console.error("Account recovery dispatch failed.");
    }
  });

  return NextResponse.json(
    { data: { accepted: true } },
    {
      headers: { "Cache-Control": PRIVATE_NO_STORE },
      status: 202,
    },
  );
}

function withPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  return response;
}
