import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ACCOUNT_RECOVERY_EMAIL_SUBJECT,
  buildAccountRecoveryLoginPath,
  deliverAccountRecoveryEmail,
  parseAccountRecoveryRequest,
} from "@/lib/account-recovery";
import {
  getAuthProviderLabel,
  getAuthProviderLabels,
} from "@/lib/auth-provider-labels";
import type {
  EmailSendInput,
  EmailSendResult,
} from "@/lib/email-provider";

const root = new URL("../", import.meta.url);

test("account recovery normalizes valid context and rejects unsafe input", () => {
  assert.deepEqual(
    parseAccountRecoveryRequest({
      email: " Member@Example.COM ",
      intent: "host",
      next: "/host?tab=programs",
    }),
    {
      values: {
        email: "member@example.com",
        intent: "host",
        next: "/host?tab=programs",
      },
    },
  );

  assert.deepEqual(
    parseAccountRecoveryRequest({
      email: "member@example.com",
      intent: "admin",
      next: "//attacker.example/steal",
    }),
    {
      values: {
        email: "member@example.com",
        intent: null,
        next: null,
      },
    },
  );

  assert.deepEqual(parseAccountRecoveryRequest({ email: "not-an-email" }), {
    error: "올바른 이메일 주소를 입력해 주세요.",
  });
});

test("account recovery login links preserve only normalized next and intent", () => {
  assert.equal(
    buildAccountRecoveryLoginPath({
      intent: "apply",
      next: "/programs/demo/apply?step=contact",
    }),
    "/login?next=%2Fprograms%2Fdemo%2Fapply%3Fstep%3Dcontact&intent=apply",
  );
  assert.equal(
    buildAccountRecoveryLoginPath({ intent: null, next: null }),
    "/login",
  );
});

test("provider labels cover every supported login identity and remain ordered", () => {
  assert.equal(getAuthProviderLabel("custom:naver"), "네이버");
  assert.equal(getAuthProviderLabel("naver"), "네이버");
  assert.equal(getAuthProviderLabel(" KAKAO "), "카카오");
  assert.equal(getAuthProviderLabel("google"), "Google");
  assert.equal(getAuthProviderLabel("email"), "이메일/비밀번호");
  assert.equal(getAuthProviderLabel("unknown-provider"), null);
  assert.deepEqual(
    getAuthProviderLabels([
      "email",
      "google",
      "custom:naver",
      "naver",
      "kakao",
      "google",
      "unknown-provider",
    ]),
    ["카카오", "네이버", "Google", "이메일/비밀번호"],
  );
});

test("recovery email is sent only for an existing account and lists all identities", async () => {
  const sent: EmailSendInput[] = [];
  const sendEmail = async (input: EmailSendInput): Promise<EmailSendResult> => {
    sent.push(input);
    return { provider: "test" };
  };
  const request = {
    email: "member@example.com",
    intent: "participant" as const,
    loginUrl: "https://nuvio.kr/login?intent=participant",
    next: null,
  };

  assert.equal(
    await deliverAccountRecoveryEmail(request, {
      findAccount: async () => null,
      sendEmail,
    }),
    false,
  );
  assert.equal(sent.length, 0);

  assert.equal(
    await deliverAccountRecoveryEmail(request, {
      findAccount: async () => ({
        email: "member@example.com",
        providers: ["custom:naver", "google", "email"],
      }),
      sendEmail,
    }),
    true,
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.subject, ACCOUNT_RECOVERY_EMAIL_SUBJECT);
  assert.equal(sent[0]?.to, "member@example.com");
  assert.match(sent[0]?.text ?? "", /네이버/u);
  assert.match(sent[0]?.text ?? "", /Google/u);
  assert.match(sent[0]?.text ?? "", /이메일\/비밀번호/u);
  assert.match(sent[0]?.text ?? "", /https:\/\/nuvio\.kr\/login/u);
  assert.equal(sent[0]?.metadata, undefined);
});

test("account recovery route keeps lookup private, bounded, and persistently limited", () => {
  const route = read("src/app/api/auth/account-recovery/route.ts");
  const service = read("src/lib/account-recovery.ts");

  assert.match(route, /enforceSameOrigin\(request\)/u);
  assert.match(route, /readJsonWithLimit\(request, MAX_PAYLOAD_BYTES\)/u);
  assert.match(route, /MAX_PAYLOAD_BYTES = 4 \* 1024/u);
  assert.match(route, /key: "account-recovery:ip"[\s\S]*limit: 5[\s\S]*60 \* 60 \* 1000/u);
  assert.match(route, /key: "account-recovery:email"[\s\S]*limit: 3[\s\S]*24 \* 60 \* 60 \* 1000/u);
  assert.match(route, /identity: validation\.values\.email/u);
  assert.equal((route.match(/failureMode: "deny"/gu) ?? []).length, 2);
  assert.match(route, /after\(async \(\) =>/u);
  assert.match(route, /status: 202/u);
  assert.match(route, /private, no-store/u);
  assert.doesNotMatch(route, /listUsers/u);

  assert.match(service, /from auth\.users as auth_user/u);
  assert.match(service, /left join auth\.identities as auth_identity/u);
  assert.match(service, /auth_user\.email = \$\{normalizedEmail\}/u);
  assert.match(service, /email_confirmed_at is not null/u);
  assert.doesNotMatch(service, /console\.(?:log|warn|error)/u);
});

function read(path: string): string {
  return readFileSync(new URL(path, root), "utf8");
}
