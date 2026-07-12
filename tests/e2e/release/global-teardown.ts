import {
  cleanupReleaseE2EFixture,
  countReleaseE2ERemnants,
} from "./support/database";
import {
  readReleaseE2EState,
  removeReleaseE2EState,
} from "./support/state";

export default async function globalTeardown() {
  let state;
  try {
    state = await readReleaseE2EState();
  } catch {
    return;
  }

  await cleanupReleaseE2EFixture(state);
  await new Promise((resolve) => setTimeout(resolve, 750));
  await cleanupReleaseE2EFixture(state);
  const remnants = await countReleaseE2ERemnants(state);
  const remainingCount = Object.values(remnants).reduce((sum, value) => sum + value, 0);
  console.log(
    JSON.stringify({ event: "release-e2e-fixture-cleaned", prefix: state.prefix, remnants }),
  );
  if (remainingCount > 0) {
    throw new Error(`Release E2E cleanup left rows behind: ${JSON.stringify(remnants)}`);
  }

  await removeReleaseE2EState();
}
