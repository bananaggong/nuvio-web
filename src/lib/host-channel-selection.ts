import type { HostProgramDraft } from "@/lib/host-program-studio";
import type { Village } from "@/lib/village-types";

export function selectHostChannel(
  channels: Village[] | undefined,
  requestedSlug: string | null | undefined,
): Village | null {
  if (!Array.isArray(channels) || channels.length === 0) return null;

  const normalizedSlug = normalizeChannelSlug(requestedSlug);
  if (!normalizedSlug) return channels[0] ?? null;

  return (
    channels.find(
      (channel) => normalizeChannelSlug(channel.slug) === normalizedSlug,
    ) ??
    channels[0] ??
    null
  );
}

export function buildChannelScopedHref(
  href: string,
  channelSlug: string | null | undefined,
): string {
  const normalizedSlug = normalizeChannelSlug(channelSlug);
  if (!normalizedSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}channel=${encodeURIComponent(normalizedSlug)}`;
}

export function hostChannelProgramsEndpoint(channel: Village | null): string | null {
  if (!channel) return null;
  if (channel.id) {
    return `/api/host/programs?channelId=${encodeURIComponent(channel.id)}`;
  }
  if (channel.slug) {
    return `/api/host/programs?channelSlug=${encodeURIComponent(channel.slug)}`;
  }

  return null;
}

export function filterProgramsForChannel(
  programs: HostProgramDraft[] | undefined,
  channel: Village | null,
): HostProgramDraft[] {
  if (!Array.isArray(programs) || !channel) return [];

  const linkedProgramIds = new Set(
    channel.programIds.map((id) => String(id).trim()).filter(Boolean),
  );
  const channelId = channel.id.trim();

  return programs.filter((program) => {
    if (program.villageId && channelId && program.villageId === channelId) {
      return true;
    }

    return (
      linkedProgramIds.has(program.id) ||
      Boolean(program.slug && linkedProgramIds.has(program.slug))
    );
  });
}

export function normalizeChannelSlug(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  try {
    return decodeURIComponent(trimmed).trim().toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}
