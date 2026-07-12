import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type ReleaseE2EAccount = {
  email: string;
  password: string;
  userId?: string;
};

export type ReleaseE2EState = {
  applicationId?: string;
  boardPostId: string;
  galleryId?: string;
  host: ReleaseE2EAccount;
  hostStoragePath: string;
  magazineId?: string;
  participant: ReleaseE2EAccount;
  participantStoragePath: string;
  prefix: string;
  program: { id: string; slug: string; title: string };
  reviewBody: string;
  reviewId?: string;
  runId: string;
  startedAt: string;
  village: { id: string; name: string; slug: string };
};

const stateDirectory = path.resolve("test-results", "release-e2e-runtime");
const statePath = path.join(stateDirectory, "state.json");

export async function readReleaseE2EState(): Promise<ReleaseE2EState> {
  return JSON.parse(await readFile(statePath, "utf8")) as ReleaseE2EState;
}

export async function writeReleaseE2EState(state: ReleaseE2EState): Promise<void> {
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function updateReleaseE2EState(
  update: (state: ReleaseE2EState) => ReleaseE2EState,
): Promise<ReleaseE2EState> {
  const state = update(await readReleaseE2EState());
  await writeReleaseE2EState(state);
  return state;
}

export async function removeReleaseE2EState(): Promise<void> {
  await rm(stateDirectory, { force: true, recursive: true });
}
