#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const routes = process.argv.slice(2);
const targetRoutes = routes.length > 0 ? routes : ["/host/channels/settings"];
const baseUrl = process.env.NUVIO_VERIFY_BASE_URL ?? "http://localhost:3001";
const defaultHeight = Number(process.env.NUVIO_VERIFY_HEIGHT ?? 1000);
const viewports = parseViewports(process.env.NUVIO_VERIFY_VIEWPORTS, defaultHeight);
const npxBin = "npx";
const windowsNpxCli = join(
  dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npx-cli.js",
);
const session = `nuvio-overflow-${process.pid}-${Date.now()}-${randomUUID()}`;
const runnerDirectory = mkdtempSync(join(tmpdir(), "nuvio-overflow-"));
const runnerPath = join(runnerDirectory, "runner.js");
const measurePageCheckpoints = () => {
  const measure = () => {
    const main = document.querySelector("main");
    const documentElement = document.documentElement;
    const body = document.body;
    const horizontalScrollContainers = [...document.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          /(auto|scroll)/.test(style.overflowX) &&
          element.scrollWidth > element.clientWidth + 1
        );
      })
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className:
          typeof element.className === "string"
            ? element.className.slice(0, 160)
            : "",
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));

    return {
      documentScrollWidth: documentElement.scrollWidth,
      documentClientWidth: documentElement.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      mainScrollWidth: main?.scrollWidth ?? null,
      mainClientWidth: main?.clientWidth ?? null,
      horizontalScrollContainers,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
  };

  const checkpoints = [
    ["top", 0],
    ["middle", document.documentElement.scrollHeight / 2],
    ["bottom", document.documentElement.scrollHeight],
  ];

  return checkpoints.map(([label, scrollTop]) => {
    window.scrollTo(0, scrollTop);
    return { label, result: measure() };
  });
};

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
    if (!existsSync(windowsNpxCli)) {
      throw new Error(`Unable to locate the npm npx CLI at ${windowsNpxCli}`);
    }

    return execFileSync(process.execPath, [windowsNpxCli, ...commandArgs], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
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

function parseViewports(value, fallbackHeight) {
  if (!value?.trim()) {
    return [1440, 1920].map((width) => ({ height: fallbackHeight, width }));
  }

  return value.split(",").map((entry) => {
    const match = entry.trim().match(/^(\d+)x(\d+)$/u);
    if (!match) {
      throw new Error(
        `Invalid NUVIO_VERIFY_VIEWPORTS entry: ${entry}. Use WIDTHxHEIGHT values separated by commas.`,
      );
    }

    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width < 240 || height < 240) {
      throw new Error(`Viewport is too small to verify: ${width}x${height}`);
    }

    return { height, width };
  });
}

function createAuditRunner() {
  const config = {
    routes: targetRoutes.map((route) => ({ label: route, url: routeUrl(route) })),
    viewports,
  };

  return `async(page)=>{
    const config=${JSON.stringify(config)};
    const results=[];
    for(const route of config.routes){
      for(const viewport of config.viewports){
        await page.setViewportSize(viewport);
        await page.goto(route.url,{waitUntil:"domcontentloaded"});
        const checkpoints=await page.evaluate(${measurePageCheckpoints.toString()});
        for(const checkpoint of checkpoints){
          results.push({
            route:route.label,
            viewport,
            label:checkpoint.label,
            result:checkpoint.result,
          });
        }
      }
    }
    return results;
  }`;
}

function overflowAmount(result) {
  const documentOverflow =
    result.documentScrollWidth - result.documentClientWidth;
  const bodyOverflow = result.bodyScrollWidth - result.bodyClientWidth;
  const mainOverflow =
    result.mainScrollWidth != null && result.mainClientWidth != null
      ? result.mainScrollWidth - result.mainClientWidth
      : 0;
  return Math.max(documentOverflow, bodyOverflow, mainOverflow);
}

let failed = false;

try {
  runCli(["open", "about:blank"]);
  const auditRunner = createAuditRunner();
  writeFileSync(runnerPath, auditRunner, "utf8");
  const auditOutput = runCli(
    ["run-code", "--filename", runnerPath],
    { raw: true },
  );
  if (!auditOutput.trimStart().startsWith("[")) {
    throw new Error(`Overflow audit runner failed:\n${auditOutput}`);
  }
  const results = JSON.parse(auditOutput);

  for (const { label, result, route, viewport } of results) {
    const overflow = overflowAmount(result);

    if (overflow > 0) {
      failed = true;
      console.error(
        `[overflow] ${route} @ ${viewport.width}x${viewport.height} ${label}: ${overflow}px horizontal overflow`,
      );
      console.error(JSON.stringify(result, null, 2));
    } else {
      console.log(
        `[overflow] ${route} @ ${viewport.width}x${viewport.height} ${label}: ok`,
      );
    }
  }
} finally {
  try {
    runCli(["close"]);
  } catch {
    // The browser may already be closed if opening the page failed.
  }
  rmSync(runnerDirectory, { force: true, recursive: true });
}

if (failed) {
  process.exit(1);
}
