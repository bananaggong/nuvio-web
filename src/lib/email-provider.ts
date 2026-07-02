import {
  fetchPublicHttpUrl,
  readLimitedResponseText,
} from "@/lib/outbound-fetch-security";

export type EmailSendInput = {
  html?: string;
  metadata?: Record<string, unknown>;
  subject: string;
  text: string;
  to: string;
};

export type EmailSendResult = {
  provider: string;
  providerMessageId?: string;
};

export type EmailDeliveryReadiness = {
  configured: boolean;
  detail: string;
  provider: string;
  productionSafe: boolean;
};

const EMAIL_TIMEOUT_MS = 10_000;
const EMAIL_MAX_ERROR_BYTES = 2048;
const EMAIL_MAX_RESPONSE_BYTES = 16 * 1024;

export function getEmailDeliveryReadiness(): EmailDeliveryReadiness {
  const provider = getEmailProvider();

  if (provider === "resend") {
    const hasApiKey = Boolean(process.env.RESEND_API_KEY?.trim());
    const hasFrom = Boolean(getEmailFromAddress());

    return {
      configured: hasApiKey && hasFrom,
      detail:
        hasApiKey && hasFrom
          ? "Resend email delivery is configured."
          : "Set RESEND_API_KEY and EMAIL_FROM when EMAIL_PROVIDER=resend.",
      provider,
      productionSafe: hasApiKey && hasFrom,
    };
  }

  if (provider === "webhook") {
    const hasUrl = Boolean(process.env.EMAIL_WEBHOOK_URL?.trim());
    const hasFrom = Boolean(getEmailFromAddress());

    return {
      configured: hasUrl && hasFrom,
      detail:
        hasUrl && hasFrom
          ? "Email webhook delivery is configured."
          : "Set EMAIL_WEBHOOK_URL and EMAIL_FROM when EMAIL_PROVIDER=webhook.",
      provider,
      productionSafe: hasUrl && hasFrom,
    };
  }

  if (provider === "mock") {
    const productionSafe = process.env.NODE_ENV !== "production";
    return {
      configured: productionSafe,
      detail:
        productionSafe
          ? "Mock email delivery is enabled for development."
          : "Mock email delivery must not be used in production.",
      provider,
      productionSafe,
    };
  }

  return {
    configured: false,
    detail: "Set EMAIL_PROVIDER to resend, webhook, or mock.",
    provider,
    productionSafe: false,
  };
}

export function isEmailDeliveryConfigured(): boolean {
  return getEmailDeliveryReadiness().configured;
}

export async function sendEmailMessage(
  input: EmailSendInput,
): Promise<EmailSendResult> {
  const provider = getEmailProvider();

  if (provider === "resend") {
    return sendResendEmail(input);
  }

  if (provider === "webhook") {
    return sendWebhookEmail(input);
  }

  if (provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Mock email delivery is disabled in production.");
    }

    return {
      provider,
      providerMessageId: `mock-${Date.now()}`,
    };
  }

  throw new Error("Email delivery provider is not configured.");
}

async function sendResendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = getEmailFromAddress();

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM are required.");
  }

  const response = await fetchPublicHttpUrl("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: [input.to],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await readLimitedResponseText(
      response,
      EMAIL_MAX_ERROR_BYTES,
    ).catch(() => "");
    throw new Error(
      `Resend email failed with ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  const payload = await readJsonResponse(response);
  return {
    provider: "resend",
    providerMessageId: getMessageId(payload),
  };
}

async function sendWebhookEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const url = process.env.EMAIL_WEBHOOK_URL?.trim();
  const from = getEmailFromAddress();

  if (!url || !from) {
    throw new Error("EMAIL_WEBHOOK_URL and EMAIL_FROM are required.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authHeader = process.env.EMAIL_WEBHOOK_AUTH_HEADER?.trim();
  const authToken = process.env.EMAIL_WEBHOOK_AUTH_TOKEN?.trim();
  if (authHeader && authToken) headers[authHeader] = authToken;

  const response = await fetchPublicHttpUrl(
    url,
    {
      body: JSON.stringify({
        from,
        html: input.html,
        metadata: input.metadata ?? {},
        subject: input.subject,
        text: input.text,
        to: input.to,
      }),
      headers,
      method: "POST",
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    },
    { maxRedirects: 1 },
  );

  if (!response.ok) {
    const text = await readLimitedResponseText(
      response,
      EMAIL_MAX_ERROR_BYTES,
    ).catch(() => "");
    throw new Error(
      `Email webhook failed with ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  const payload = await readJsonResponse(response);
  return {
    provider: "webhook",
    providerMessageId: getMessageId(payload),
  };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await readLimitedResponseText(
    response,
    EMAIL_MAX_RESPONSE_BYTES,
  ).catch(() => "");
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function getMessageId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as {
    data?: { id?: unknown; messageId?: unknown };
    id?: unknown;
    messageId?: unknown;
  };
  const id = record.id ?? record.messageId ?? record.data?.id ?? record.data?.messageId;
  return typeof id === "string" ? id : undefined;
}

function getEmailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() ?? "";
}

function getEmailProvider(): string {
  return (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
}
