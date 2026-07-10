import { isIP } from "node:net";
import webPush from "web-push";
import type { BrowserPushSubscriptionRecord } from "@/lib/push-subscription-db";

export type BrowserPushPayload = {
  body: string;
  href?: string;
  icon?: string;
  tag?: string;
  title: string;
  type?: string;
};

export type BrowserPushDeliveryResult =
  | { message: string; status: "sent" }
  | { message: string; status: "expired" }
  | { message: string; status: "failed" }
  | { message: string; status: "skipped" };

type WebPushConfig = {
  privateKey: string;
  publicKey: string;
  subject: string;
};

let configuredSignature = "";

const webPushDeliveryTimeoutMs = 10_000;
const exactBrowserPushHosts = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

export function getBrowserPushPublicKey(): string {
  return process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";
}

export function isBrowserPushConfigured(): boolean {
  return Boolean(getBrowserPushConfig());
}

export function isSupportedBrowserPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    url.hash
  ) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  const ipCandidate =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  if (isIP(ipCandidate) !== 0) return false;

  return (
    exactBrowserPushHosts.has(hostname) ||
    (hostname.endsWith(".notify.windows.com") &&
      hostname !== "notify.windows.com")
  );
}

export async function sendBrowserPushNotification(
  subscription: BrowserPushSubscriptionRecord,
  payload: BrowserPushPayload,
): Promise<BrowserPushDeliveryResult> {
  if (!isSupportedBrowserPushEndpoint(subscription.endpoint)) {
    return {
      message: "Browser push endpoint is not supported.",
      status: "failed",
    };
  }

  const config = getBrowserPushConfig();
  if (!config) {
    return {
      message: "Browser push VAPID keys are not configured.",
      status: "skipped",
    };
  }

  configureWebPush(config);

  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          auth: subscription.auth,
          p256dh: subscription.p256dh,
        },
      },
      JSON.stringify({
        body: payload.body,
        href: payload.href ?? "/",
        icon: payload.icon ?? "/brand/nuvio-symbol.svg",
        tag: payload.tag,
        title: payload.title,
        type: payload.type,
      }),
      { timeout: webPushDeliveryTimeoutMs },
    );

    return { message: "Delivered as browser push notification.", status: "sent" };
  } catch (error) {
    const statusCode = getErrorStatusCode(error);
    if (statusCode === 404 || statusCode === 410) {
      return {
        message: "Browser push subscription expired.",
        status: "expired",
      };
    }

    return {
      message:
        error instanceof Error
          ? error.message
          : "Browser push delivery failed.",
      status: "failed",
    };
  }
}

function getBrowserPushConfig(): WebPushConfig | null {
  const publicKey = getBrowserPushPublicKey();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject =
    process.env.WEB_PUSH_VAPID_SUBJECT?.trim() ||
    process.env.WEB_PUSH_CONTACT?.trim() ||
    "mailto:support@nuvio.kr";

  if (!publicKey || !privateKey) return null;

  return { privateKey, publicKey, subject };
}

function configureWebPush(config: WebPushConfig) {
  const signature = `${config.subject}:${config.publicKey}:${config.privateKey}`;
  if (configuredSignature === signature) return;

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  configuredSignature = signature;
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" ? value : undefined;
}
