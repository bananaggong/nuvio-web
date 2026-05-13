import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTED_PREFIX = "v1:";
const PLAIN_PREFIX = "plain:";

export function protectSecret(value: string): string {
  const secret = value.trim();
  if (!secret) return secret;

  const key = getEncryptionKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is required in production.");
    }
    return `${PLAIN_PREFIX}${secret}`;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX.slice(0, -1),
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function revealSecret(value: string | null | undefined): string {
  if (!value) return "";

  if (value.startsWith(PLAIN_PREFIX)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Plain social tokens are not allowed in production.");
    }
    return value.slice(PLAIN_PREFIX.length);
  }

  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY is required to read encrypted social tokens.");
  }

  const [, ivValue, tagValue, encryptedValue] = value.split(":");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored social token is malformed.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey(): Buffer | null {
  const rawKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!rawKey) return null;

  return createHash("sha256").update(rawKey).digest();
}
