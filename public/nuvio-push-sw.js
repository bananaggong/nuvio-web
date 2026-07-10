self.addEventListener("push", (event) => {
  const data = readPushPayload(event);
  const title = data.title || "누비오";
  const options = {
    badge: data.badge || "/brand/nuvio-symbol.svg",
    body: data.body || "",
    data: {
      href: data.href || "/",
      type: data.type || "",
    },
    icon: data.icon || "/brand/nuvio-symbol.svg",
    tag: data.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const href = event.notification.data?.href || "/";
  const targetUrl = getNotificationTargetUrl(href);

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client && client.url === targetUrl) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});

function getNotificationTargetUrl(href) {
  try {
    const url = new URL(href, self.location.origin);
    if (url.origin === self.location.origin) return url.toString();
  } catch {
    // Fall through to the same-origin home page.
  }

  return new URL("/", self.location.origin).toString();
}

function readPushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
}
