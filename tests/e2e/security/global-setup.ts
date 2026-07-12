import {
  cleanupSecurityE2EFixture,
  createSecurityE2EFixture,
} from "./support/database";
import { writeSecurityE2EState } from "./support/state";

export default async function globalSetup() {
  const state = await createSecurityE2EFixture();
  try {
    await writeSecurityE2EState(state);
  } catch (error) {
    await cleanupSecurityE2EFixture(state);
    throw error;
  }

  console.log(
    JSON.stringify({
      event: "security-e2e-fixture-created",
      prefix: state.prefix,
      tenantA: state.tenantA.villageSlug,
      tenantB: state.tenantB.villageSlug,
    }),
  );
}
