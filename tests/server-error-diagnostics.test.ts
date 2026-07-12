import assert from "node:assert/strict";
import test from "node:test";
import { logServerPersistenceError } from "../src/lib/server-error-diagnostics";

test("server persistence diagnostics redact personal identifiers", () => {
  const originalConsoleError = console.error;
  const calls: unknown[][] = [];
  console.error = (...args: unknown[]) => calls.push(args);

  try {
    const cause = Object.assign(
      new Error(
        "insert failed for release.person@example.com, 010-9000-0002, 0f30f250-cd77-43d0-a448-3bf96eddf904",
      ),
      {
        code: "23505",
        constraint: "program_applications_program_email_unique",
        table: "program_applications",
      },
    );
    logServerPersistenceError("Persistence failed.", new Error("Query failed", { cause }));
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.[0], "Persistence failed.");
  const diagnostic = calls[0]?.[1] as Record<string, unknown>;
  assert.equal(diagnostic.code, "23505");
  assert.equal(diagnostic.table, "program_applications");
  assert.match(String(diagnostic.message), /\[redacted-email\]/u);
  assert.match(String(diagnostic.message), /\[redacted-phone\]/u);
  assert.match(String(diagnostic.message), /\[redacted-id\]/u);
  assert.doesNotMatch(String(diagnostic.message), /release\.person@example\.com/u);
  assert.doesNotMatch(String(diagnostic.message), /010-9000-0002/u);
  assert.doesNotMatch(
    String(diagnostic.message),
    /0f30f250-cd77-43d0-a448-3bf96eddf904/u,
  );
});
