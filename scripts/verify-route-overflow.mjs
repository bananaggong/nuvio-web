#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const routes = process.argv.slice(2);
const targetRoutes = routes.length > 0 ? routes : ["/host/channels/settings"];
const baseUrl = process.env.NUVIO_VERIFY_BASE_URL ?? "http://localhost:3001";
const widths = [1440, 1920];
const height = Number(process.env.NUVIO_VERIFY_HEIGHT ?? 1000);
const npxBin = "npx";
const session = `nuvio-overflow-${process.pid}-${Date.now()}-${randomUUID()}`;
const overflowProbe =
  "Y29uc3QgbT1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCJtYWluIiksZD1kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsYj1kb2N1bWVudC5ib2R5Owpjb25zdCBob3Jpem9udGFsU2Nyb2xsQ29udGFpbmVycz1bLi4uZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgiKiIpXS5maWx0ZXIoKGVsKT0+e2NvbnN0IHM9Z2V0Q29tcHV0ZWRTdHlsZShlbCk7cmV0dXJuIC8oYXV0b3xzY3JvbGwpLy50ZXN0KHMub3ZlcmZsb3dYKSYmZWwuc2Nyb2xsV2lkdGg+ZWwuY2xpZW50V2lkdGgrMTt9KS5zbGljZSgwLDEwKS5tYXAoKGVsKT0+KHt0YWc6ZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpLGNsYXNzTmFtZTp0eXBlb2YgZWwuY2xhc3NOYW1lPT09InN0cmluZyI/ZWwuY2xhc3NOYW1lLnNsaWNlKDAsMTYwKToiIixzY3JvbGxXaWR0aDplbC5zY3JvbGxXaWR0aCxjbGllbnRXaWR0aDplbC5jbGllbnRXaWR0aH0pKTsKcmV0dXJuIHtkb2N1bWVudFNjcm9sbFdpZHRoOmQuc2Nyb2xsV2lkdGgsZG9jdW1lbnRDbGllbnRXaWR0aDpkLmNsaWVudFdpZHRoLGJvZHlTY3JvbGxXaWR0aDpiLnNjcm9sbFdpZHRoLGJvZHlDbGllbnRXaWR0aDpiLmNsaWVudFdpZHRoLG1haW5TY3JvbGxXaWR0aDptPy5zY3JvbGxXaWR0aD8/bnVsbCxtYWluQ2xpZW50V2lkdGg6bT8uY2xpZW50V2lkdGg/P251bGwsaG9yaXpvbnRhbFNjcm9sbENvbnRhaW5lcnMsc2Nyb2xsWDp3aW5kb3cuc2Nyb2xsWCxzY3JvbGxZOndpbmRvdy5zY3JvbGxZLGlubmVyV2lkdGg6d2luZG93LmlubmVyV2lkdGgsaW5uZXJIZWlnaHQ6d2luZG93LmlubmVySGVpZ2h0fTs=";

function quoteWindowsArg(value) {
  const text = String(value);
  if (!/[ \t&()^|<>"]/u.test(text)) return text;

  return `"${text.replace(/"/g, '\\"')}"`;
}

function runCli(args, { raw = false } = {}) {
  const commandArgs = [
    "--yes",
    "--package",
    "@playwright/cli",
    "playwright-cli",
    ...(raw ? ["--raw"] : []),
    `-s=${session}`,
    ...args,
  ];

  if (process.platform === "win32") {
    return execFileSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/c", ["npx", ...commandArgs].map(quoteWindowsArg).join(" ")],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  }

  return execFileSync(npxBin, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function routeUrl(route) {
  if (/^https?:\/\//u.test(route)) return route;

  return new URL(route, baseUrl).toString();
}

function readOverflow() {
  return JSON.parse(
    runCli(
      [
        "eval",
        `()=>Function(atob('${overflowProbe}'))()`,
      ],
      { raw: true },
    ),
  );
}

function overflowAmount(result) {
  const documentOverflow =
    result.documentScrollWidth - result.documentClientWidth;
  const bodyOverflow = result.bodyScrollWidth - result.bodyClientWidth;
  const mainOverflow =
    result.mainScrollWidth != null && result.mainClientWidth != null
      ? result.mainScrollWidth - result.mainClientWidth
      : 0;
  const innerOverflow = result.horizontalScrollContainers?.length ? 1 : 0;

  return Math.max(documentOverflow, bodyOverflow, mainOverflow, innerOverflow);
}

let failed = false;

try {
  runCli(["open", routeUrl(targetRoutes[0])]);

  for (const route of targetRoutes) {
    runCli(["goto", routeUrl(route)]);

    for (const width of widths) {
      runCli(["resize", String(width), String(height)]);

      const checkpoints = [
        ["top", "window.scrollTo(0,0);return!!1"],
        ["middle", "window.scrollTo(0,document.documentElement.scrollHeight/2);return!!1"],
        ["bottom", "window.scrollTo(0,document.documentElement.scrollHeight);return!!1"],
      ];

      for (const [label, scrollScript] of checkpoints) {
        runCli(["eval", `()=>{${scrollScript}}`], { raw: true });
        const result = readOverflow();
        const overflow = overflowAmount(result);

        if (overflow > 0) {
          failed = true;
          console.error(
            `[overflow] ${route} @ ${width}px ${label}: ${overflow}px horizontal overflow`,
          );
          console.error(JSON.stringify(result, null, 2));
        } else {
          console.log(`[overflow] ${route} @ ${width}px ${label}: ok`);
        }
      }
    }
  }
} finally {
  try {
    runCli(["close"]);
  } catch {
    // The browser may already be closed if opening the page failed.
  }
}

if (failed) {
  process.exit(1);
}
