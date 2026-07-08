export const channelProgramStatusFilters = [
  "all",
  "open",
  "upcoming",
  "closed",
] as const;

export const channelProgramSortOrders = ["latest", "oldest"] as const;

export type ChannelProgramStatusFilter =
  (typeof channelProgramStatusFilters)[number];

export type ChannelProgramSortOrder = (typeof channelProgramSortOrders)[number];

export function normalizeChannelProgramStatusFilter(
  value: unknown,
): ChannelProgramStatusFilter {
  return typeof value === "string" &&
    channelProgramStatusFilters.includes(value as ChannelProgramStatusFilter)
    ? (value as ChannelProgramStatusFilter)
    : "all";
}

export function normalizeChannelProgramSortOrder(
  value: unknown,
): ChannelProgramSortOrder {
  return typeof value === "string" &&
    channelProgramSortOrders.includes(value as ChannelProgramSortOrder)
    ? (value as ChannelProgramSortOrder)
    : "latest";
}

export function buildChannelProgramsHref({
  baseHref,
  filter = "all",
  sort = "latest",
}: {
  baseHref: string;
  filter?: ChannelProgramStatusFilter;
  sort?: ChannelProgramSortOrder;
}) {
  const params = new URLSearchParams();

  if (filter !== "all") {
    params.set("status", filter);
  }

  if (sort !== "latest") {
    params.set("sort", sort);
  }

  const query = params.toString();

  return query ? `${baseHref}?${query}` : baseHref;
}
