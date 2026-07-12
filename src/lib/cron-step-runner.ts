export type CronStepRunResult = {
  data: Record<string, unknown>;
  errors: Record<string, string>;
  failed: number;
  ok: boolean;
};

export async function runCronSteps(
  steps: Record<string, () => Promise<unknown>>,
): Promise<CronStepRunResult> {
  const entries = Object.entries(steps);
  const settled = await Promise.allSettled(
    entries.map(([, run]) => Promise.resolve().then(run)),
  );
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  settled.forEach((result, index) => {
    const [name] = entries[index];
    if (result.status === "fulfilled") {
      data[name] = result.value;
      return;
    }

    const errorName = result.reason instanceof Error
      ? result.reason.name.slice(0, 120)
      : "UnknownError";
    console.error("Cron step failed.", { errorName, step: name });
    errors[name] = "Step failed. Check the server logs for the redacted diagnostic.";
  });

  return {
    data,
    errors,
    failed: Object.keys(errors).length,
    ok: Object.keys(errors).length === 0,
  };
}
