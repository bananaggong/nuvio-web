import assert from "node:assert/strict";
import test from "node:test";
import { isSupportedBrowserPushEndpoint } from "../src/lib/browser-push.ts";

test("browser push endpoint allowlist accepts supported vendor services", () => {
  const endpoints = [
    "https://fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com:443/fcm/send/token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/QTOKEN",
    "https://wns2-bl2p.notify.windows.com/w/?token=value",
  ];

  for (const endpoint of endpoints) {
    assert.equal(isSupportedBrowserPushEndpoint(endpoint), true, endpoint);
  }
});

test("browser push endpoint allowlist rejects SSRF and URL parsing bypasses", () => {
  const endpoints = [
    "http://fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com:444/fcm/send/token",
    "https://user@fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com/fcm/send/token#fragment",
    "https://fcm.googleapis.com.evil.example/fcm/send/token",
    "https://notify.windows.com/w/?token=value",
    "https://wns.notify.windows.com.evil.example/w/?token=value",
    "https://127.0.0.1/push",
    "https://[::1]/push",
    "https://10.0.0.1/push",
    "https://push.internal/push",
    "not a URL",
  ];

  for (const endpoint of endpoints) {
    assert.equal(isSupportedBrowserPushEndpoint(endpoint), false, endpoint);
  }
});
