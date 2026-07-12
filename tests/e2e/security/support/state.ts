import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type SecurityAccountKey = "admin" | "hostA" | "hostB" | "memberA" | "memberB";

export type SecurityE2EAccount = {
  email: string;
  password: string;
  role: "admin" | "partner" | "user";
  storagePath: string;
  userId: string;
};

export type SecurityTenantFixture = {
  applicationId: string;
  inquiryId: string;
  inquiryMessageId: string;
  programId: string;
  programSlug: string;
  programTitle: string;
  reviewBody: string;
  reviewId: string;
  villageId: string;
  villageName: string;
  villageSlug: string;
};

export type SecurityE2EState = {
  accounts: Record<SecurityAccountKey, SecurityE2EAccount>;
  boardPostId: string;
  prefix: string;
  runId: string;
  startedAt: string;
  tenantA: SecurityTenantFixture;
  tenantB: SecurityTenantFixture;
};

const stateDirectory = path.resolve("test-results", "security-e2e-runtime");
const statePath = path.join(stateDirectory, "state.json");

export async function readSecurityE2EState(): Promise<SecurityE2EState> {
  return JSON.parse(await readFile(statePath, "utf8")) as SecurityE2EState;
}

export async function writeSecurityE2EState(state: SecurityE2EState): Promise<void> {
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function removeSecurityE2EState(): Promise<void> {
  await rm(stateDirectory, { force: true, recursive: true });
}
