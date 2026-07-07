export function parseLegacyProgramIdentifier(value: string): number | undefined {
  const text = value.trim();
  if (!/^\d+$/u.test(text)) return undefined;

  const legacyId = Number(text);
  return Number.isSafeInteger(legacyId) ? legacyId : undefined;
}
