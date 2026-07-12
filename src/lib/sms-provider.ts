import {
  fetchPublicHttpUrl,
  readLimitedResponseText,
} from "@/lib/outbound-fetch-security";

export type SmsSendInput = {
  body: string;
  idempotencyKey?: string;
  to: string;
};

export type SmsSendResult = {
  provider: string;
  providerMessageId?: string;
};

export type SmsDeliveryReadiness = {
  configured: boolean;
  detail: string;
  provider: string;
  productionSafe: boolean;
};

const SMS_WEBHOOK_TIMEOUT_MS = 10_000;
const SMS_WEBHOOK_MAX_ERROR_BYTES = 2048;
const SMS_WEBHOOK_MAX_RESPONSE_BYTES = 16 * 1024;

export async function sendSmsMessage(input: SmsSendInput): Promise<SmsSendResult> {
  const readiness = getSmsDeliveryReadiness();
  const provider = readiness.provider;

  if (!readiness.configured) {
    throw new Error(readiness.detail);
  }

  if (provider === "webhook") {
    return sendWebhookSms(input);
  }

  return {
    provider: "mock",
    providerMessageId: `mock-${input.idempotencyKey ?? Date.now()}`,
  };
}

export function getSmsDeliveryReadiness(): SmsDeliveryReadiness {
  const provider = (process.env.SMS_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "webhook") {
    const configured = Boolean(process.env.SMS_WEBHOOK_URL?.trim());
    return {
      configured,
      detail: configured
        ? "SMS webhook delivery is configured."
        : "SMS_WEBHOOK_URL is required when SMS_PROVIDER=webhook.",
      productionSafe: configured,
      provider,
    };
  }

  if (provider === "mock") {
    const productionSafe = process.env.NODE_ENV !== "production";
    return {
      configured: productionSafe,
      detail: productionSafe
        ? "Mock SMS delivery is enabled for development."
        : "Mock SMS delivery must not be used in production.",
      productionSafe,
      provider,
    };
  }

  return {
    configured: false,
    detail: "Set SMS_PROVIDER to webhook or mock.",
    productionSafe: false,
    provider,
  };
}

async function sendWebhookSms(input: SmsSendInput): Promise<SmsSendResult> {
  const url = process.env.SMS_WEBHOOK_URL?.trim();
  if (!url) {
    throw new Error("SMS_WEBHOOK_URL is required when SMS_PROVIDER=webhook.");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey;
  const authHeader = process.env.SMS_WEBHOOK_AUTH_HEADER?.trim();
  const authToken = process.env.SMS_WEBHOOK_AUTH_TOKEN?.trim();
  if (authHeader && authToken) headers[authHeader] = authToken;

  const response = await fetchPublicHttpUrl(
    url,
    {
      body: JSON.stringify({
        idempotencyKey: input.idempotencyKey,
        message: input.body,
        to: input.to,
      }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(SMS_WEBHOOK_TIMEOUT_MS),
    },
    { maxRedirects: 1 },
  );

  if (!response.ok) {
    await readLimitedResponseText(
      response,
      SMS_WEBHOOK_MAX_ERROR_BYTES,
    ).catch(() => "");
    throw new Error(`SMS webhook failed with ${response.status}.`);
  }

  const payloadText = await readLimitedResponseText(
    response,
    SMS_WEBHOOK_MAX_RESPONSE_BYTES,
  ).catch(() => "");
  const payload = parseWebhookResponsePayload(payloadText);

  return {
    provider: "webhook",
    providerMessageId: payload.messageId ?? payload.id,
  };
}

function parseWebhookResponsePayload(value: string): {
  id?: string;
  messageId?: string;
} {
  if (!value.trim()) return {};

  try {
    const payload = JSON.parse(value) as { id?: unknown; messageId?: unknown };
    return {
      id: typeof payload.id === "string" ? payload.id : undefined,
      messageId:
        typeof payload.messageId === "string" ? payload.messageId : undefined,
    };
  } catch {
    return {};
  }
}
