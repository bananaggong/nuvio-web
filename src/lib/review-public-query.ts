export class PublicReviewQueryError extends Error {
  constructor(message = "Invalid review query.") {
    super(message);
    this.name = "PublicReviewQueryError";
  }
}

export function normalizePublicReviewQueryText(
  value: string | null | undefined,
  fieldName: string,
  maxLength = 120,
): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;

  if (text.length > maxLength) {
    throw new PublicReviewQueryError(`${fieldName} must be ${maxLength} characters or less.`);
  }

  if (/[\u0000-\u001f\u007f]/u.test(text)) {
    throw new PublicReviewQueryError(`${fieldName} contains invalid characters.`);
  }

  return text;
}