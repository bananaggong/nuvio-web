import { createSign } from "node:crypto";

import { readLimitedResponseText } from "@/lib/outbound-fetch-security";
import {
  notifyManualDispatchDiscord,
  type ManualDispatchDiscordResult,
} from "@/lib/manual-dispatch-discord";
import { formatKoreanMobilePhone } from "@/lib/korean-mobile-phone";

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com";
const DEFAULT_SHEET_TITLE = "발송대기";
const GOOGLE_REQUEST_TIMEOUT_MS = 10_000;
const GOOGLE_MAX_ERROR_BODY_BYTES = 2 * 1024;
const GOOGLE_MAX_RESPONSE_BODY_BYTES = 2 * 1024 * 1024;
const GOOGLE_MAX_TOKEN_BODY_BYTES = 64 * 1024;
const TOKEN_TTL_BUFFER_MS = 60 * 1000;

const DISPATCH_HEADERS = [
  "message_id",
  "상태",
  "발송예정시각",
  "트리거",
  "프로그램명",
  "신청ID",
  "이름",
  "전화번호",
  "채널",
  "템플릿",
  "본문",
  "담당자",
  "발송완료시각",
  "발송번호",
  "결과",
  "메모",
] as const;

export type ManualDispatchSheetRow = {
  applicationId: string;
  applicantName: string;
  body: string;
  channel: string;
  messageId: string;
  phone: string;
  programTitle: string;
  scheduledFor?: Date | null;
  templateName?: string;
  trigger?: string;
};

export type ManualDispatchSheetSyncResult = {
  discordNotification?: ManualDispatchDiscordResult;
  message: string;
  missingIds?: string[];
  rowCount?: number;
  sheetTitle?: string;
  spreadsheetId?: string;
  status: "failed" | "skipped" | "synced";
  updatedCount?: number;
};

type ManualDispatchSheetsConfig =
  | {
      privateKey: string;
      serviceAccountEmail: string;
      sheetTitle: string;
      spreadsheetId: string;
    }
  | { skipped: true; reason: string };

type CachedAccessToken = {
  accessToken: string;
  expiresAt: number;
};

type SpreadsheetMetadata = {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
};

type ValuesResponse = {
  values?: string[][];
};

let cachedToken: CachedAccessToken | undefined;

export async function appendManualDispatchRows(
  rows: ManualDispatchSheetRow[],
): Promise<ManualDispatchSheetSyncResult> {
  if (rows.length === 0) {
    return { message: "No dispatch rows to append.", status: "skipped" };
  }

  const config = getManualDispatchSheetsConfig();
  if ("skipped" in config) {
    return { message: config.reason, status: "skipped" };
  }

  try {
    const sheetTitle = await ensureManualDispatchSheet(config);
    await ensureDispatchSheetHeader(config, sheetTitle);

    const range = `${quoteSheetTitle(sheetTitle)}!A:P`;
    await googleSheetsFetch(config, `/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      body: JSON.stringify({
        values: rows.map(buildDispatchSheetRow),
      }),
      method: "POST",
    });
    const discordNotification = await notifyManualDispatchDiscord(rows);

    return {
      discordNotification,
      message: `${rows.length} dispatch rows appended to Google Sheets.`,
      rowCount: rows.length,
      sheetTitle,
      spreadsheetId: config.spreadsheetId,
      status: "synced",
    };
  } catch (error) {
    return {
      message: normalizeError(error),
      rowCount: rows.length,
      spreadsheetId: config.spreadsheetId,
      status: "failed",
    };
  }
}

export async function markManualDispatchRowsSent(input: {
  actorEmail?: string;
  memo?: string;
  messageIds: string[];
  result?: string;
  senderPhone?: string;
  sentAt?: Date;
}): Promise<ManualDispatchSheetSyncResult> {
  const messageIds = Array.from(new Set(input.messageIds.filter(Boolean)));
  if (messageIds.length === 0) {
    return { message: "No dispatch rows to update.", status: "skipped" };
  }

  const config = getManualDispatchSheetsConfig();
  if ("skipped" in config) {
    return { message: config.reason, status: "skipped" };
  }

  try {
    const sheetTitle = await ensureManualDispatchSheet(config);
    await ensureDispatchSheetHeader(config, sheetTitle);

    const range = `${quoteSheetTitle(sheetTitle)}!A:P`;
    const response = await googleSheetsFetch<ValuesResponse>(
      config,
      `/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}`,
    );
    const rows = response.values ?? [];
    const targetIds = new Set(messageIds);
    const updates: Array<{ range: string; values: string[][] }> = [];
    const foundIds = new Set<string>();
    const sentAt = input.sentAt ?? new Date();

    rows.slice(1).forEach((row, index) => {
      const messageId = row[0]?.trim();
      if (!messageId || !targetIds.has(messageId)) return;

      foundIds.add(messageId);
      const nextRow = normalizeSheetRow(row);
      nextRow[1] = "발송완료";
      nextRow[11] = input.actorEmail?.trim() || nextRow[11] || "";
      nextRow[12] = formatKoreaDateTime(sentAt);
      nextRow[13] = input.senderPhone?.trim() || nextRow[13] || "";
      nextRow[14] = input.result?.trim() || nextRow[14] || "업무폰 수동 발송";
      nextRow[15] = input.memo?.trim() || nextRow[15] || "";

      const rowNumber = index + 2;
      updates.push({
        range: `${quoteSheetTitle(sheetTitle)}!A${rowNumber}:P${rowNumber}`,
        values: [nextRow],
      });
    });

    if (updates.length > 0) {
      await googleSheetsFetch(config, `/v4/spreadsheets/${config.spreadsheetId}/values:batchUpdate`, {
        body: JSON.stringify({
          data: updates,
          valueInputOption: "RAW",
        }),
        method: "POST",
      });
    }

    const missingIds = messageIds.filter((id) => !foundIds.has(id));
    return {
      message: `${updates.length} dispatch rows marked sent in Google Sheets.`,
      missingIds,
      sheetTitle,
      spreadsheetId: config.spreadsheetId,
      status: "synced",
      updatedCount: updates.length,
    };
  } catch (error) {
    return {
      message: normalizeError(error),
      spreadsheetId: config.spreadsheetId,
      status: "failed",
    };
  }
}

function getManualDispatchSheetsConfig(): ManualDispatchSheetsConfig {
  const serviceAccountEmail = stripWrappingQuotes(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "",
  );
  const privateKey = normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
  const spreadsheetId =
    process.env.GOOGLE_MANUAL_MESSAGE_SPREADSHEET_ID?.trim() ?? "";

  if (!spreadsheetId) {
    return {
      reason:
        "GOOGLE_MANUAL_MESSAGE_SPREADSHEET_ID is required.",
      skipped: true,
    };
  }

  if (!serviceAccountEmail || !privateKey) {
    return {
      reason:
        "Google service account env is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
      skipped: true,
    };
  }

  return {
    privateKey,
    serviceAccountEmail,
    sheetTitle: sanitizeSheetTitle(
      process.env.GOOGLE_MANUAL_MESSAGE_SHEET_NAME || DEFAULT_SHEET_TITLE,
    ),
    spreadsheetId,
  };
}

async function ensureManualDispatchSheet(
  config: Exclude<ManualDispatchSheetsConfig, { skipped: true }>,
): Promise<string> {
  const metadata = await googleSheetsFetch<SpreadsheetMetadata>(
    config,
    `/v4/spreadsheets/${config.spreadsheetId}?fields=sheets(properties(sheetId,title))`,
  );
  const existing = metadata.sheets?.find(
    (sheet) => sheet.properties?.title === config.sheetTitle,
  );
  if (existing?.properties?.title) return existing.properties.title;

  try {
    await googleSheetsFetch(config, `/v4/spreadsheets/${config.spreadsheetId}:batchUpdate`, {
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                gridProperties: { frozenRowCount: 1 },
                title: config.sheetTitle,
              },
            },
          },
        ],
      }),
      method: "POST",
    });
  } catch (error) {
    const refreshed = await googleSheetsFetch<SpreadsheetMetadata>(
      config,
      `/v4/spreadsheets/${config.spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    );
    const concurrentlyCreated = refreshed.sheets?.find(
      (sheet) => sheet.properties?.title === config.sheetTitle,
    );
    if (concurrentlyCreated?.properties?.title) {
      return concurrentlyCreated.properties.title;
    }

    throw error;
  }

  return config.sheetTitle;
}

async function ensureDispatchSheetHeader(
  config: Exclude<ManualDispatchSheetsConfig, { skipped: true }>,
  sheetTitle: string,
) {
  const range = `${quoteSheetTitle(sheetTitle)}!A1:P1`;
  const existing = await googleSheetsFetch<ValuesResponse>(
    config,
    `/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}`,
  );
  const firstRow = existing.values?.[0] ?? [];
  const headerMatches = DISPATCH_HEADERS.every(
    (header, index) => firstRow[index] === header,
  );
  if (headerMatches) return;

  await googleSheetsFetch(config, `/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    body: JSON.stringify({ values: [DISPATCH_HEADERS] }),
    method: "PUT",
  });
}

async function googleSheetsFetch<T = unknown>(
  config: Exclude<ManualDispatchSheetsConfig, { skipped: true }>,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = await getGoogleAccessToken(config);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${GOOGLE_SHEETS_API_BASE}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    await readLimitedResponseText(
      response,
      GOOGLE_MAX_ERROR_BODY_BYTES,
    ).catch(() => "");
    throw new Error(`Google Sheets API failed with ${response.status}.`);
  }

  if (response.status === 204) return {} as T;
  return parseJsonResponse<T>(
    await readLimitedResponseText(response, GOOGLE_MAX_RESPONSE_BODY_BYTES),
  );
}

async function getGoogleAccessToken(
  config: Exclude<ManualDispatchSheetsConfig, { skipped: true }>,
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - TOKEN_TTL_BUFFER_MS > now) {
    return cachedToken.accessToken;
  }

  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + 3600;
  const assertion = signJwt(
    {
      alg: "RS256",
      typ: "JWT",
    },
    {
      aud: GOOGLE_TOKEN_URL,
      exp: expiresAt,
      iat: issuedAt,
      iss: config.serviceAccountEmail,
      scope: GOOGLE_SHEETS_SCOPE,
    },
    config.privateKey,
  );

  const response = await fetch(GOOGLE_TOKEN_URL, {
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    await readLimitedResponseText(
      response,
      GOOGLE_MAX_ERROR_BODY_BYTES,
    ).catch(() => "");
    throw new Error(`Google OAuth token request failed with ${response.status}.`);
  }

  const payload = parseJsonResponse<{
    access_token?: string;
    expires_in?: number;
  }>(await readLimitedResponseText(response, GOOGLE_MAX_TOKEN_BODY_BYTES));
  if (!payload.access_token) {
    throw new Error("Google OAuth token response did not include access_token.");
  }

  cachedToken = {
    accessToken: payload.access_token,
    expiresAt: now + (payload.expires_in ?? 3600) * 1000,
  };

  return cachedToken.accessToken;
}

function parseJsonResponse<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

function signJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKey: string,
): string {
  const signingInput = [
    toBase64Url(JSON.stringify(header)),
    toBase64Url(JSON.stringify(payload)),
  ].join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer.sign(privateKey);

  return `${signingInput}.${toBase64Url(signature)}`;
}

function buildDispatchSheetRow(row: ManualDispatchSheetRow): string[] {
  return [
    row.messageId,
    "대기",
    formatKoreaDateTime(row.scheduledFor),
    row.trigger?.trim() || "호스트 수동예약",
    row.programTitle,
    row.applicationId,
    row.applicantName,
    formatKoreanMobilePhone(row.phone),
    row.channel,
    row.templateName ?? "",
    row.body,
    "",
    "",
    "",
    "",
    "",
  ];
}

function normalizeSheetRow(row: string[]): string[] {
  return Array.from({ length: DISPATCH_HEADERS.length }, (_, index) => row[index] ?? "");
}

function formatKoreaDateTime(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);
}

function normalizePrivateKey(value?: string): string {
  if (!value) return "";
  return stripWrappingQuotes(value.trim()).replace(/\\n/gu, "\n");
}

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function sanitizeSheetTitle(value: string): string {
  const cleaned = value
    .replace(/[:\\/?*\[\]]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return (cleaned || DEFAULT_SHEET_TITLE).slice(0, 100);
}

function quoteSheetTitle(title: string): string {
  return `'${title.replace(/'/gu, "''")}'`;
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : "Google Sheets sync failed.";
}
