"use client";

export type BrowserPushClientStatus =
  | "unsupported"
  | "missingKey"
  | "denied"
  | "default"
  | "subscribed"
  | "unsubscribed";

export type BrowserPushClientResult = {
  endpoint?: string;
  message: string;
  status: BrowserPushClientStatus;
};

const serviceWorkerPath = "/nuvio-push-sw.js";

export function getBrowserNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function isBrowserPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function enableBrowserPushNotifications(): Promise<BrowserPushClientResult> {
  if (!isBrowserPushSupported()) {
    return {
      message: "이 브라우저는 푸시 알림을 지원하지 않아요.",
      status: "unsupported",
    };
  }

  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return {
      message: "브라우저 푸시 공개 키가 설정되지 않았어요.",
      status: "missingKey",
    };
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission === "denied") {
    return {
      message: "브라우저에서 누비오 알림 권한이 차단되어 있어요.",
      status: "denied",
    };
  }

  if (permission !== "granted") {
    return {
      message: "알림 권한 허용이 필요해요.",
      status: "default",
    };
  }

  const registration = await navigator.serviceWorker.register(serviceWorkerPath);
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToArrayBuffer(publicKey),
      userVisibleOnly: true,
    }));

  const response = await fetch("/api/me/push-subscriptions", {
    body: JSON.stringify({ subscription }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "브라우저 알림 구독을 저장하지 못했어요.");
  }

  await updateBrowserPushPreference(true);

  return {
    endpoint: subscription.endpoint,
    message: "브라우저 알림이 켜졌어요.",
    status: "subscribed",
  };
}

export async function disableBrowserPushNotifications(): Promise<BrowserPushClientResult> {
  if (!isBrowserPushSupported()) {
    await updateBrowserPushPreference(false);
    return {
      message: "이 브라우저는 푸시 알림을 지원하지 않아요.",
      status: "unsupported",
    };
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await fetch("/api/me/push-subscriptions", {
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    await subscription.unsubscribe().catch(() => false);
  } else {
    await fetch("/api/me/push-subscriptions", {
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    }).catch(() => undefined);
  }

  await updateBrowserPushPreference(false);

  return {
    endpoint: subscription?.endpoint,
    message: "브라우저 알림이 꺼졌어요.",
    status: "unsubscribed",
  };
}

async function updateBrowserPushPreference(enabled: boolean) {
  await fetch("/api/me/notification-preferences", {
    body: JSON.stringify({ browserPushEnabled: enabled }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/gu, "+")
    .replace(/_/gu, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray.buffer.slice(0);
}
