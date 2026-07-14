import { fetchPublicHttpUrl } from "@/lib/outbound-fetch-security";
import type { ManualDispatchSheetRow } from "@/lib/manual-dispatch-sheet";

const DISCORD_WEBHOOK_TIMEOUT_MS = 10_000;

export type ManualDispatchDiscordResult = {
  message: string;
  status: "failed" | "skipped" | "sent";
};

export async function notifyManualDispatchDiscord(
  rows: ManualDispatchSheetRow[],
): Promise<ManualDispatchDiscordResult> {
  const webhookUrl = process.env.DISCORD_MANUAL_MESSAGE_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { message: "Discord webhook is not configured.", status: "skipped" };
  }

  try {
    assertDiscordWebhookUrl(webhookUrl);
    const response = await fetchPublicHttpUrl(
      webhookUrl,
      {
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          content: buildManualDispatchDiscordContent(rows),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(DISCORD_WEBHOOK_TIMEOUT_MS),
      },
      { maxRedirects: 0 },
    );

    if (!response.ok) {
      return {
        message: `Discord webhook failed with ${response.status}.`,
        status: "failed",
      };
    }

    return { message: "Discord notification sent.", status: "sent" };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Discord notification failed.",
      status: "failed",
    };
  }
}

export function buildManualDispatchDiscordContent(
  rows: ManualDispatchSheetRow[],
): string {
  const programs = Array.from(
    new Set(rows.map((row) => row.programTitle.trim()).filter(Boolean)),
  );
  const scheduledTimes = Array.from(
    new Set(
      rows
        .map((row) => formatKoreaDateTime(row.scheduledFor))
        .filter(Boolean),
    ),
  );

  return [
    "📨 새 문자 발송 예약이 Google Sheet에 추가되었습니다.",
    `예약 건수: ${rows.length}건`,
    `프로그램: ${programs.length > 0 ? programs.join(", ") : "미지정"}`,
    `발송 예정: ${scheduledTimes.length > 0 ? scheduledTimes.join(", ") : "미지정"}`,
    "확인 위치: Google Sheet > 발송대기",
  ].join("\n");
}

function assertDiscordWebhookUrl(value: string): void {
  const url = new URL(value);
  const allowedHostname =
    url.hostname === "discord.com" || url.hostname === "discordapp.com";
  if (
    url.protocol !== "https:" ||
    !allowedHostname ||
    !/^\/api\/webhooks\/\d+\/[A-Za-z0-9._-]+$/u.test(url.pathname)
  ) {
    throw new Error("Discord webhook URL is invalid.");
  }
}

function formatKoreaDateTime(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}
