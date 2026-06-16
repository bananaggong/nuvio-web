export type SmsSendInput = {
  body: string;
  to: string;
};

export type SmsSendResult = {
  provider: string;
  providerMessageId?: string;
};

export async function sendSmsMessage(input: SmsSendInput): Promise<SmsSendResult> {
  const provider = (process.env.SMS_PROVIDER ?? "mock").trim().toLowerCase();

  if (provider === "webhook") {
    return sendWebhookSms(input);
  }

  return {
    provider: "mock",
    providerMessageId: `mock-${Date.now()}`,
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
  const authHeader = process.env.SMS_WEBHOOK_AUTH_HEADER?.trim();
  const authToken = process.env.SMS_WEBHOOK_AUTH_TOKEN?.trim();
  if (authHeader && authToken) headers[authHeader] = authToken;

  const response = await fetch(url, {
    body: JSON.stringify({
      message: input.body,
      to: input.to,
    }),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SMS webhook failed with ${response.status}${text ? `: ${text}` : ""}`,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    messageId?: string;
  };

  return {
    provider: "webhook",
    providerMessageId: payload.messageId ?? payload.id,
  };
}
