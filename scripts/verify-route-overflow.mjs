#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const routes = process.argv.slice(2);
const targetRoutes = routes.length > 0 ? routes : ["/host/channels/settings"];
const baseUrl = process.env.NUVIO_VERIFY_BASE_URL ?? "http://localhost:3001";
const widths = [1440, 1920];
const height = Number(process.env.NUVIO_VERIFY_HEIGHT ?? 1000);
const npxBin = "npx";
const session = `nuvio-overflow-${Date.now()}`;

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

let failed = false;

try {
  runCli(["open", routeUrl(targetRoutes[0])]);

  for (const route of targetRoutes) {
    runCli(["goto", routeUrl(route)]);

    for (const width of widths) {
      runCli(["resize", String(width), String(height)]);
      const result = JSON.parse(
        runCli(
          [
            "eval",
            "()=>({documentScrollWidth:document.documentElement.scrollWidth,documentClientWidth:document.documentElement.clientWidth,bodyScrollWidth:document.body.scrollWidth,bodyClientWidth:document.body.clientWidth})",
          ],
          { raw: true },
        ),
      );
      const documentOverflow =
        result.documentScrollWidth - result.documentClientWidth;
      const bodyOverflow = result.bodyScrollWidth - result.bodyClientWidth;
      const overflow = Math.max(documentOverflow, bodyOverflow);

      if (overflow > 0) {
        failed = true;
        console.error(
          `[overflow] ${route} @ ${width}px: ${overflow}px horizontal overflow`,
        );
        console.error(JSON.stringify(result, null, 2));
      } else {
        console.log(`[overflow] ${route} @ ${width}px: ok`);
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
