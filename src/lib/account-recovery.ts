import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getAuthProviderLabels } from "@/lib/auth-provider-labels";
import {
  sendEmailMessage,
  type EmailSendInput,
  type EmailSendResult,
} from "@/lib/email-provider";
import { isSafeRelativePath } from "@/lib/url-security";

export const ACCOUNT_RECOVERY_EMAIL_SUBJECT =
  "[누비오] 가입한 로그인 방식을 확인해 주세요";

export type AccountRecoveryIntent = "apply" | "host" | "participant";

export type AccountRecoveryRequest = {
  email: string;
  intent: AccountRecoveryIntent | null;
  next: string | null;
};

type AccountRecoveryAccount = {
  email: string;
  providers: string[];
};

type AccountRecoveryDependencies = {
  findAccount: (email: string) => Promise<AccountRecoveryAccount | null>;
  sendEmail: (input: EmailSendInput) => Promise<EmailSendResult>;
};

type AuthAccountRow = {
  email: string;
  providers: string[] | null;
};

const defaultDependencies: AccountRecoveryDependencies = {
  findAccount: findAccountRecoveryAccount,
  sendEmail: sendEmailMessage,
};

export function parseAccountRecoveryRequest(
  input: unknown,
): { values: AccountRecoveryRequest } | { error: string } {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const email = normalizeAccountRecoveryEmail(record.email);

  if (!email || email.length > 254 || !isValidEmail(email)) {
    return { error: "올바른 이메일 주소를 입력해 주세요." };
  }

  return {
    values: {
      email,
      intent: normalizeAccountRecoveryIntent(record.intent),
      next: normalizeAccountRecoveryNext(record.next),
    },
  };
}

export function buildAccountRecoveryLoginPath(
  input: Pick<AccountRecoveryRequest, "intent" | "next">,
): string {
  const searchParams = new URLSearchParams();
  if (input.next) searchParams.set("next", input.next);
  if (input.intent) searchParams.set("intent", input.intent);
  const query = searchParams.toString();
  return query ? `/login?${query}` : "/login";
}

export async function deliverAccountRecoveryEmail(
  input: AccountRecoveryRequest & { loginUrl: string },
  dependencies: AccountRecoveryDependencies = defaultDependencies,
): Promise<boolean> {
  const account = await dependencies.findAccount(input.email);
  if (!account) return false;

  const providerLabels = getAuthProviderLabels(account.providers);
  if (providerLabels.length === 0) return false;

  const message = buildAccountRecoveryEmail(providerLabels, input.loginUrl);
  await dependencies.sendEmail({
    html: message.html,
    idempotencyKey: `account-recovery:${randomUUID()}`,
    subject: ACCOUNT_RECOVERY_EMAIL_SUBJECT,
    text: message.text,
    to: account.email,
  });
  return true;
}

export async function findAccountRecoveryAccount(
  normalizedEmail: string,
): Promise<AccountRecoveryAccount | null> {
  const rows = await getDb().execute<AuthAccountRow>(sql`
    select
      auth_user.email as "email",
      coalesce(
        array_agg(distinct auth_identity.provider)
          filter (where auth_identity.provider is not null),
        array[]::text[]
      ) as "providers"
    from auth.users as auth_user
    left join auth.identities as auth_identity
      on auth_identity.user_id = auth_user.id
    where auth_user.email = ${normalizedEmail}
      and auth_user.email_confirmed_at is not null
      and auth_user.deleted_at is null
    group by auth_user.id, auth_user.email
    limit 1
  `);
  const account = rows[0];

  if (!account || typeof account.email !== "string") return null;

  return {
    email: account.email.trim().toLowerCase(),
    providers: Array.isArray(account.providers)
      ? account.providers.filter(
          (provider): provider is string => typeof provider === "string",
        )
      : [],
  };
}

function normalizeAccountRecoveryEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeAccountRecoveryIntent(
  value: unknown,
): AccountRecoveryIntent | null {
  return value === "apply" || value === "host" || value === "participant"
    ? value
    : null;
}

function normalizeAccountRecoveryNext(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalizedValue = value.trim();
  return normalizedValue && isSafeRelativePath(normalizedValue)
    ? normalizedValue
    : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function buildAccountRecoveryEmail(
  providerLabels: string[],
  loginUrl: string,
): { html: string; text: string } {
  const textProviders = providerLabels.map((label) => `- ${label}`).join("\n");
  const htmlProviders = providerLabels
    .map((label) => `<li>${escapeHtml(label)}</li>`)
    .join("");
  const safeLoginUrl = escapeHtml(loginUrl);

  return {
    html: [
      "<p>누비오 계정에 연결된 로그인 방식이에요.</p>",
      `<ul>${htmlProviders}</ul>`,
      `<p><a href="${safeLoginUrl}">누비오 로그인하기</a></p>`,
    ].join(""),
    text: [
      "누비오 계정에 연결된 로그인 방식이에요.",
      "",
      textProviders,
      "",
      `누비오 로그인하기: ${loginUrl}`,
    ].join("\n"),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
