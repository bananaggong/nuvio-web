export function isDemoModeEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_NUVIO_DEMO_MODE === "true" ||
    process.env.NUVIO_DEMO_MODE === "true" ||
    process.env.NODE_ENV !== "production"
  );
}
