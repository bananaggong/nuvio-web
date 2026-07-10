import type { HostVillageMediaDraft } from "@/lib/village-media-db";
import { readLimitedResponseText } from "@/lib/outbound-fetch-security";

export const FACEBOOK_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
] as const;

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: MetaGraphError;
};

type MetaGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

type FacebookMeResponse = {
  id?: string;
  name?: string;
  error?: MetaGraphError;
};

type FacebookPagesResponse = {
  data?: FacebookPage[];
  paging?: {
    next?: string;
  };
  error?: MetaGraphError;
};

export type FacebookPage = {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: InstagramAccount;
  connected_instagram_account?: InstagramAccount;
};

export type InstagramAccount = {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};

type InstagramMediaResponse = {
  data?: InstagramMediaItem[];
  paging?: {
    next?: string;
  };
  error?: MetaGraphError;
};

export type InstagramMediaItem = {
  id: string;
  caption?: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
};

export type FacebookOAuthConfig = {
  appId: string;
  appSecret: string;
  graphVersion: string;
  redirectUri: string;
};

const META_GRAPH_TIMEOUT_MS = 10_000;
const META_GRAPH_MAX_RESPONSE_BYTES = 64 * 1024;

export function hasFacebookOAuthConfig(): boolean {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

export function getFacebookOAuthConfig(requestUrl: URL): FacebookOAuthConfig {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new Error("FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required.");
  }

  return {
    appId,
    appSecret,
    graphVersion: normalizeGraphVersion(process.env.META_GRAPH_API_VERSION),
    redirectUri:
      process.env.FACEBOOK_REDIRECT_URI?.trim() ||
      new URL("/api/host/facebook/callback", requestUrl.origin).toString(),
  };
}

export function buildFacebookOAuthUrl(
  config: FacebookOAuthConfig,
  state: string,
): string {
  const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", FACEBOOK_OAUTH_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("auth_type", "rerequest");

  return url.toString();
}

export async function exchangeFacebookCode(
  config: FacebookOAuthConfig,
  code: string,
): Promise<{ accessToken: string; expiresAt?: string }> {
  const tokenUrl = new URL(
    `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`,
  );
  tokenUrl.searchParams.set("client_id", config.appId);
  tokenUrl.searchParams.set("client_secret", config.appSecret);
  tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
  tokenUrl.searchParams.set("code", code);

  const shortToken = await fetchMetaJson<FacebookTokenResponse>(tokenUrl);
  if (!shortToken.access_token) {
    throw new Error("Facebook did not return an access token.");
  }

  const longTokenUrl = new URL(
    `https://graph.facebook.com/${config.graphVersion}/oauth/access_token`,
  );
  longTokenUrl.searchParams.set("grant_type", "fb_exchange_token");
  longTokenUrl.searchParams.set("client_id", config.appId);
  longTokenUrl.searchParams.set("client_secret", config.appSecret);
  longTokenUrl.searchParams.set("fb_exchange_token", shortToken.access_token);

  const longToken = await fetchMetaJson<FacebookTokenResponse>(longTokenUrl);
  const accessToken = longToken.access_token || shortToken.access_token;
  const expiresIn = longToken.expires_in ?? shortToken.expires_in;

  return {
    accessToken,
    expiresAt: expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined,
  };
}

export async function fetchFacebookUser(
  graphVersion: string,
  accessToken: string,
): Promise<{ id?: string; name?: string }> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/me`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", accessToken);

  return fetchMetaJson<FacebookMeResponse>(url);
}

export async function fetchFacebookPages(
  graphVersion: string,
  accessToken: string,
): Promise<FacebookPage[]> {
  const pages: FacebookPage[] = [];
  let nextUrl: string | undefined;

  const initialUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  initialUrl.searchParams.set(
    "fields",
    [
      "id",
      "name",
      "access_token",
      "instagram_business_account{id,username,name,profile_picture_url}",
      "connected_instagram_account{id,username,name,profile_picture_url}",
    ].join(","),
  );
  initialUrl.searchParams.set("limit", "100");
  initialUrl.searchParams.set("access_token", accessToken);
  nextUrl = initialUrl.toString();

  while (nextUrl) {
    const response: FacebookPagesResponse =
      await fetchMetaJson<FacebookPagesResponse>(nextUrl);
    pages.push(...(response.data ?? []));
    nextUrl = response.paging?.next;
  }

  return pages;
}

export async function fetchInstagramMedia(
  graphVersion: string,
  instagramUserId: string,
  accessToken: string,
  options: { limit?: number } = {},
): Promise<InstagramMediaItem[]> {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);
  const media: InstagramMediaItem[] = [];
  let nextUrl: string | undefined;

  const initialUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/${instagramUserId}/media`,
  );
  initialUrl.searchParams.set(
    "fields",
    [
      "id",
      "caption",
      "media_type",
      "media_url",
      "thumbnail_url",
      "permalink",
      "timestamp",
      "username",
    ].join(","),
  );
  initialUrl.searchParams.set("limit", String(limit));
  initialUrl.searchParams.set("access_token", accessToken);
  nextUrl = initialUrl.toString();

  while (nextUrl && media.length < limit) {
    const response: InstagramMediaResponse =
      await fetchMetaJson<InstagramMediaResponse>(nextUrl);
    media.push(...(response.data ?? []));
    nextUrl = response.paging?.next;
  }

  return media.slice(0, limit);
}

export function selectInstagramPage(pages: FacebookPage[]): FacebookPage | null {
  return (
    pages.find(
      (page) => page.instagram_business_account || page.connected_instagram_account,
    ) ?? null
  );
}

export function getInstagramAccount(page: FacebookPage): InstagramAccount | null {
  return page.instagram_business_account ?? page.connected_instagram_account ?? null;
}

export function normalizeInstagramMediaToDraft(
  item: InstagramMediaItem,
  villageSlug: string,
): HostVillageMediaDraft {
  const caption = item.caption?.trim() ?? "";
  const body = caption
    ? caption
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  const title = createInstagramTitle(caption, item.timestamp);
  const summary = createInstagramSummary(caption, title);
  const permalink = item.permalink ?? `https://www.instagram.com/p/${item.id}/`;
  const thumbnail =
    item.thumbnail_url ||
    item.media_url ||
    "https://upload.wikimedia.org/wikipedia/commons/b/b3/Boseong_Green_Tea_Field.jpg";
  const imageUrls = [thumbnail];
  const parsedTimestamp = item.timestamp ? Date.parse(item.timestamp) : NaN;
  const createdAt = Number.isNaN(parsedTimestamp)
    ? new Date().toISOString()
    : new Date(parsedTimestamp).toISOString();

  return {
    id: `instagram-${item.id}`,
    villageSlug,
    title,
    category: "original",
    provider: "instagram",
    summary,
    body: body.length > 0 ? body : [summary],
    thumbnail,
    images: imageUrls,
    imageUrls,
    embedUrl: normalizeInstagramEmbedUrl(permalink),
    sourceName: item.username ? `Instagram @${item.username}` : "Instagram",
    sourceUrl: permalink,
    createdAt,
    date: normalizeDate(item.timestamp),
    featured: false,
    published: true,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchMetaJson<T>(url: URL | string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(META_GRAPH_TIMEOUT_MS),
  });
  const payloadText = await readLimitedResponseText(
    response,
    META_GRAPH_MAX_RESPONSE_BYTES,
  );
  const payload = parseMetaJsonPayload<T>(payloadText);

  if (!response.ok || payload.error) {
    throw new Error(formatMetaError(payload.error, response.status));
  }

  return payload;
}

function parseMetaJsonPayload<T>(value: string): T & { error?: MetaGraphError } {
  if (!value.trim()) return {} as T & { error?: MetaGraphError };

  try {
    return JSON.parse(value) as T & { error?: MetaGraphError };
  } catch {
    return {} as T & { error?: MetaGraphError };
  }
}

function normalizeGraphVersion(value: string | undefined): string {
  const version = value?.trim();
  return version && /^v\d+\.\d+$/u.test(version) ? version : "v24.0";
}

function formatMetaError(error: MetaGraphError | undefined, status: number): string {
  const details = error?.message ?? `Meta Graph API request failed with ${status}.`;
  const trace = error?.fbtrace_id ? ` fbtrace_id=${error.fbtrace_id}` : "";
  return `${details}${trace}`;
}

function createInstagramTitle(caption: string, timestamp: string | undefined): string {
  const firstLine = caption.split("\n").find((line) => line.trim())?.trim();
  if (firstLine) return truncate(firstLine.replace(/\s+/gu, " "), 70);

  const date = normalizeDate(timestamp);
  return `Instagram 콘텐츠 ${date}`;
}

function createInstagramSummary(caption: string, fallback: string): string {
  const compact = caption.replace(/\s+/gu, " ").trim();
  if (!compact) return fallback;

  const sentence = compact.split(/(?<=[.!?。！？])\s/u)[0] || compact;
  return truncate(sentence, 140);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function normalizeDate(value: string | undefined): string {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed)
    ? new Date().toISOString().slice(0, 10)
    : new Date(parsed).toISOString().slice(0, 10);
}

function normalizeInstagramEmbedUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("instagram.com")) return undefined;

    const parts = url.pathname.split("/").filter(Boolean);
    const type = parts[0];
    const id = parts[1];
    if (!id || (type !== "reel" && type !== "p" && type !== "tv")) {
      return undefined;
    }

    return `https://www.instagram.com/${type}/${id}/embed`;
  } catch {
    return undefined;
  }
}
