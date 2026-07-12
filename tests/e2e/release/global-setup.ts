import {
  cleanupReleaseE2EFixture,
  createReleaseE2EFixture,
} from "./support/database";
import { writeReleaseE2EState } from "./support/state";

export default async function globalSetup() {
  const state = await createReleaseE2EFixture();
  try {
    await writeReleaseE2EState(state);
  } catch (error) {
    await cleanupReleaseE2EFixture(state);
    throw error;
  }
  console.log(
    JSON.stringify({
      event: "release-e2e-fixture-created",
      prefix: state.prefix,
      programId: state.program.id,
      villageSlug: state.village.slug,
    }),
  );
}
