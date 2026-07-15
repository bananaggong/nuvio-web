type DemoModeEnvironment = {
  NEXT_PUBLIC_NUVIO_DEMO_MODE?: string;
  NODE_ENV?: string;
  NUVIO_DEMO_MODE?: string;
};

export function isDemoModeEnabled(): boolean {
  return isDemoModeEnabledForEnvironment({
    NEXT_PUBLIC_NUVIO_DEMO_MODE:
      process.env.NEXT_PUBLIC_NUVIO_DEMO_MODE,
    NODE_ENV: process.env.NODE_ENV,
    NUVIO_DEMO_MODE: process.env.NUVIO_DEMO_MODE,
  });
}

export function isDemoModeEnabledForEnvironment(
  environment: DemoModeEnvironment,
): boolean {
  if (environment.NODE_ENV === "production") return false;
  if (
    environment.NODE_ENV === "development" ||
    environment.NODE_ENV === "test"
  ) {
    return true;
  }

  return (
    environment.NEXT_PUBLIC_NUVIO_DEMO_MODE === "true" ||
    environment.NUVIO_DEMO_MODE === "true"
  );
}
