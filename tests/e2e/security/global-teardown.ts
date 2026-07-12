import {
  cleanupSecurityE2EFixture,
  countSecurityE2ERemnants,
} from "./support/database";
import {
  readSecurityE2EState,
  removeSecurityE2EState,
} from "./support/state";

export default async function globalTeardown() {
  let state;
  try {
    state = await readSecurityE2EState();
  } catch {
    return;
  }

  await cleanupSecurityE2EFixture(state);
  await new Promise((resolve) => setTimeout(resolve, 750));
  await cleanupSecurityE2EFixture(state);
  const remnants = await countSecurityE2ERemnants(state);
  const remaining = Object.values(remnants).reduce((sum, value) => sum + value, 0);
  console.log(
    JSON.stringify({ event: "security-e2e-fixture-cleaned", prefix: state.prefix, remnants }),
  );
  if (remaining > 0) {
    throw new Error(`Security E2E cleanup left rows behind: ${JSON.stringify(remnants)}`);
  }
  await removeSecurityE2EState();
}
