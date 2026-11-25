import { verifyEvent, type Event } from "nostr-tools";

export interface Listing {
  address: string;
  id: string;
  pubkey: string;
  identifier: string;
  createdAt: number;
  title: string;
  summary: string;
  description: string;
  images: string[];
  location: string;
  country: string;
  currency: string;
  price: number | null;
  frequency: string;
  transaction: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

export interface ListingInput {
  title: string;
  summary: string;
  description: string;
  location: string;
  country: string;
  currency: string;
  price: string;
  frequency: string;
  transaction: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  latitude: string;
  longitude: string;
  images: string[];
  status: string;
}

export interface ListingFilters {
  query?: string;
  transaction?: string;
  propertyType?: string;
  currency?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  country?: string;
  frequency?: string;
}

export const DISCOVERY_TAGS = ["real-estate", "realestate", "property"];
const STATUSES = ["active", "sold", "rented", "withdrawn"];
const GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

function geohashCenter(hash: string): [number, number] | null {
  if (!/^[0123456789bcdefghjkmnpqrstuvwxyz]{1,12}$/.test(hash)) return null;
  const ranges = [
    [-180, 180],
    [-90, 90],
  ];
  let axis = 0;
  for (const character of hash) {
    const code = GEOHASH_ALPHABET.indexOf(character);
    for (let bit = 4; bit >= 0; bit--) {
      const range = ranges[axis];
      range[(code >> bit) & 1 ? 0 : 1] = (range[0] + range[1]) / 2;
      axis = 1 - axis;
    }
  }
  return [(ranges[1][0] + ranges[1][1]) / 2, (ranges[0][0] + ranges[0][1]) / 2];
}

function encodeGeohash(latitude: number, longitude: number): string {
  const values = [longitude, latitude];
  const ranges = [
    [-180, 180],
    [-90, 90],
  ];
  let hash = "",
    axis = 0,
    code = 0;
  for (let bit = 0; bit < 45; bit++) {
    const range = ranges[axis];
    const middle = (range[0] + range[1]) / 2;
    const upper = values[axis] >= middle;
    code = (code << 1) | Number(upper);
    range[upper ? 0 : 1] = middle;
    axis = 1 - axis;
    if (bit % 5 === 4) {
      hash += GEOHASH_ALPHABET[code];
      code = 0;
    }
  }
  return hash;
}

export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

// Reject partial numbers, non-decimal notation, infinities, and blank-to-zero coercion.
function numeric(
  value: string,
  field: string,
  min = 0,
  max = Infinity,
): number | null {
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) ||
    !Number.isFinite(number) ||
    number < min ||
    number > max
  ) {
    throw new Error(
      `${field} must be a finite number between ${min} and ${max}`,
    );
  }
  return number;
}

export function parseListing(event: Event): Listing | null {
  if (event.kind !== 30402) return null;
  const tag = (name: string) =>
    event.tags.find((entry) => entry[0] === name)?.[1] ?? "";
  const identifier = tag("d");
  const title = tag("title").trim();
  if (
    !identifier.trim() ||
    !title ||
    !event.tags.some(
      (entry) =>
        entry[0] === "t" &&
        DISCOVERY_TAGS.includes((entry[1] ?? "").trim().toLowerCase()),
    )
  )
    return null;

  const priceTag = event.tags.find((entry) => entry[0] === "price");
  try {
    let latitude = numeric(tag("latitude"), "latitude", -90, 90);
    let longitude = numeric(tag("longitude"), "longitude", -180, 180);
    if ((latitude === null) !== (longitude === null)) return null;
    if (latitude === null && longitude === null) {
      const center = geohashCenter(tag("g"));
      if (center) [latitude, longitude] = center;
    }
    return {
      address: `30402:${event.pubkey}:${identifier}`,
      id: event.id,
      pubkey: event.pubkey,
      identifier,
      createdAt: event.created_at,
      title,
      summary: tag("summary").trim(),
      description: event.content,
      images: event.tags
        .filter((entry) => entry[0] === "image")
        .map((entry) => safeUrl(entry[1] ?? ""))
        .filter((url): url is string => url !== null),
      location: tag("location").trim(),
      country: tag("country").trim().toUpperCase(),
      currency: (priceTag?.[2] ?? tag("currency")).trim().toUpperCase(),
      price: numeric(priceTag?.[1] ?? "", "price"),
      frequency: (priceTag?.[3] ?? tag("frequency")).trim(),
      transaction: tag("transaction").trim().toLowerCase(),
      propertyType: tag("property_type").trim().toLowerCase(),
      bedrooms: numeric(tag("bedrooms"), "bedrooms"),
      bathrooms: numeric(tag("bathrooms"), "bathrooms"),
      area: numeric(tag("area"), "area"),
      latitude,
      longitude,
      // Missing status is active for NIP-99 listings; unknown statuses stay inactive.
      status: tag("status").trim().toLowerCase() || "active",
    };
  } catch {
    return null;
  }
}

export function latestListings(events: Event[]): Listing[] {
  const latest = new Map<string, Event>();
  for (const event of events) {
    if (event.kind !== 30402) continue;
    try {
      // Do not trust a cached verification symbol copied from a mutated event.
      const { id, pubkey, created_at, kind, tags, content, sig } = event;
      if (!verifyEvent({ id, pubkey, created_at, kind, tags, content, sig }))
        continue;
    } catch {
      continue;
    }
    const identifier = event.tags.find((tag) => tag[0] === "d")?.[1] ?? "";
    const address = `30402:${event.pubkey}:${identifier}`;
    const previous = latest.get(address);
    if (
      !previous ||
      event.created_at > previous.created_at ||
      (event.created_at === previous.created_at && event.id < previous.id)
    ) {
      latest.set(address, event);
    }
  }
  return [...latest.values()]
    .map(parseListing)
    .filter(
      (listing): listing is Listing =>
        listing !== null && listing.status === "active",
    )
    .sort(
      (a, b) =>
        b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterListings(
  listings: Listing[],
  filters: ListingFilters,
): Listing[] {
  const currency = filters.currency?.trim().toUpperCase() ?? "";
  const hasRange = !!(filters.minPrice?.trim() || filters.maxPrice?.trim());
  if (hasRange && !currency) return [];
  const frequency =
    filters.frequency ||
    (hasRange && filters.transaction === "sale" ? "once" : "");
  if (hasRange && !frequency) return [];
  let min: number | null;
  let max: number | null;
  let bedrooms: number | null;
  try {
    min = numeric(filters.minPrice ?? "", "minPrice");
    max = numeric(filters.maxPrice ?? "", "maxPrice");
    bedrooms = numeric(filters.bedrooms ?? "", "bedrooms");
  } catch {
    return [];
  }
  if (min !== null && max !== null && min > max) return [];
  const words = normalize(filters.query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return listings.filter((listing) => {
    const text = normalize(
      [
        listing.title,
        listing.summary,
        listing.description,
        listing.location,
        listing.country,
        listing.propertyType,
      ].join(" "),
    );
    return (
      words.every((word) => text.includes(word)) &&
      (!filters.transaction?.trim() ||
        listing.transaction === filters.transaction.trim().toLowerCase()) &&
      (!filters.propertyType?.trim() ||
        listing.propertyType === filters.propertyType.trim().toLowerCase()) &&
      (!currency || listing.currency === currency) &&
      (!frequency ||
        (frequency === "once"
          ? !listing.frequency
          : listing.frequency === frequency)) &&
      (!filters.country?.trim() ||
        listing.country === filters.country.trim().toUpperCase()) &&
      (!hasRange ||
        (listing.price !== null &&
          (min === null || listing.price >= min) &&
          (max === null || listing.price <= max))) &&
      (bedrooms === null ||
        (listing.bedrooms !== null && listing.bedrooms >= bedrooms))
    );
  });
}

export function formatPrice(listing: Listing, locale = "en"): string {
  if (listing.price === null) return "On request";
  let price: string;
  try {
    const fractionalFiat =
      !Number.isInteger(listing.price) &&
      !["BTC", "ETH"].includes(listing.currency.toUpperCase());
    const minimumFractionDigits = fractionalFiat
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: listing.currency,
        }).resolvedOptions().minimumFractionDigits
      : 0;
    price = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: listing.currency,
      minimumFractionDigits,
      maximumFractionDigits: listing.currency.toUpperCase() === "ETH" ? 18 : 8,
    }).format(listing.price);
  } catch {
    price =
      `${listing.price.toLocaleString(locale)} ${listing.currency}`.trim();
  }
  return listing.frequency ? `${price} / ${listing.frequency}` : price;
}

export function buildListingTags(
  input: ListingInput,
  identifier: string,
  publishedAt: number,
): string[][] {
  for (const field of [
    "title",
    "description",
    "location",
    "currency",
  ] as const) {
    if (!input[field].trim()) throw new Error(`${field} is required`);
  }
  if (!identifier.trim()) throw new Error("identifier is required");
  if (!Number.isSafeInteger(publishedAt) || publishedAt < 0) {
    throw new Error("publishedAt must be a non-negative integer");
  }
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency))
    throw new Error("currency must be a three-letter code");
  const country = input.country.trim().toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country))
    throw new Error("country must be a two-letter ISO code");
  const transaction = input.transaction.trim().toLowerCase();
  if (!["sale", "rent"].includes(transaction))
    throw new Error("transaction must be sale or rent");
  const status = input.status.trim().toLowerCase();
  if (!STATUSES.includes(status))
    throw new Error("status must be active, sold, rented, or withdrawn");
  const latitude = numeric(input.latitude, "latitude", -90, 90);
  const longitude = numeric(input.longitude, "longitude", -180, 180);
  if ((latitude === null) !== (longitude === null))
    throw new Error("latitude and longitude must both be provided");
  const price = numeric(input.price, "price");
  const tags: string[][] = [
    ["d", identifier],
    ["title", input.title.trim()],
    ["summary", input.summary.trim()],
    ["published_at", String(publishedAt)],
    ["t", "real-estate"],
    ["vastgoed_schema", "1"],
    ["location", input.location.trim()],
    ["country", country],
    ["currency", currency],
    ["transaction", transaction],
    ["property_type", input.propertyType.trim().toLowerCase()],
    ["status", status],
  ];
  if (price !== null)
    tags.push(["price", input.price.trim(), currency, input.frequency.trim()]);
  else if (input.frequency.trim())
    tags.push(["frequency", input.frequency.trim()]);
  for (const field of ["bedrooms", "bathrooms", "area"] as const) {
    const value = numeric(input[field], field);
    if (value !== null)
      tags.push(
        field === "area"
          ? [field, String(value), "m2"]
          : [field, String(value)],
      );
  }
  if (latitude !== null && longitude !== null) {
    tags.push(["latitude", String(latitude)], ["longitude", String(longitude)]);
    tags.push(["g", encodeGeohash(latitude, longitude)]);
  }
  for (const image of input.images) {
    const url = safeUrl(image);
    if (!url) throw new Error("images must use safe HTTPS URLs");
    tags.push(["image", url]);
  }
  return tags;
}
