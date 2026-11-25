import { describe, expect, it } from "vitest";
import { finalizeEvent, generateSecretKey, type Event } from "nostr-tools";
import {
  buildListingTags,
  DISCOVERY_TAGS,
  filterListings,
  formatPrice,
  latestListings,
  parseListing,
  safeUrl,
  type Listing,
  type ListingInput,
} from "./model";

const key = generateSecretKey();
const input: ListingInput = {
  title: "Canal apartment",
  summary: "Bright home",
  description: "A home in the city",
  location: "Amsterdam",
  country: "nl",
  currency: "eur",
  price: "450000",
  frequency: "",
  transaction: "sale",
  propertyType: "apartment",
  bedrooms: "2",
  bathrooms: "1.5",
  area: "85",
  latitude: "52.37",
  longitude: "4.9",
  images: ["https://example.com/home.jpg"],
  status: "active",
};

function signed(
  overrides: Partial<ListingInput> = {},
  createdAt = 100,
  identifier = "home",
): Event {
  const values = { ...input, ...overrides };
  return finalizeEvent(
    {
      kind: 30402,
      created_at: createdAt,
      content: values.description,
      tags: buildListingTags(values, identifier, 50),
    },
    key,
  );
}

function retag(
  event: Event,
  name: string,
  values: string[][],
  createdAt = event.created_at,
): Event {
  return finalizeEvent(
    {
      kind: event.kind,
      created_at: createdAt,
      content: event.content,
      tags: [...event.tags.filter((tag) => tag[0] !== name), ...values],
    },
    key,
  );
}

function listing(overrides: Partial<ListingInput> = {}): Listing {
  return parseListing(signed(overrides))!;
}

describe("parseListing", () => {
  it("reads an approximate location from a standard NIP-99 geohash", () => {
    const event = signed();
    event.tags = event.tags.filter(
      (tag) => !["latitude", "longitude"].includes(tag[0]),
    );
    const result = parseListing(event)!;
    expect(result.latitude).toBeCloseTo(52.37, 3);
    expect(result.longitude).toBeCloseTo(4.9, 3);
  });

  it("does not create a map pin from a malformed geohash", () => {
    const event = signed({ latitude: "", longitude: "" });
    event.tags.push(["g", "not-a-geohash"]);
    expect(parseListing(event)?.latitude).toBeNull();
    expect(parseListing(event)?.longitude).toBeNull();
  });
  it("round-trips the custom schema and NIP-99 fields", () => {
    const event = signed();
    expect(parseListing(event)).toEqual({
      address: `30402:${event.pubkey}:home`,
      id: event.id,
      pubkey: event.pubkey,
      identifier: "home",
      createdAt: 100,
      title: input.title,
      summary: input.summary,
      description: input.description,
      images: input.images,
      location: "Amsterdam",
      country: "NL",
      currency: "EUR",
      price: 450000,
      frequency: "",
      transaction: "sale",
      propertyType: "apartment",
      bedrooms: 2,
      bathrooms: 1.5,
      area: 85,
      latitude: 52.37,
      longitude: 4.9,
      status: "active",
    });
  });

  it.each(DISCOVERY_TAGS)("recognizes normalized discovery tag %s", (tag) => {
    expect(
      parseListing(retag(signed(), "t", [["t", ` ${tag.toUpperCase()} `]])),
    ).not.toBeNull();
  });

  it("requires kind, identifier, title and discovery tag", () => {
    const event = signed();
    expect(parseListing({ ...event, kind: 1 })).toBeNull();
    for (const name of ["d", "title", "t"]) {
      expect(parseListing(retag(event, name, []))).toBeNull();
      expect(parseListing(retag(event, name, [[name, "  "]]))).toBeNull();
    }
  });

  it("drops malicious images without dropping the listing", () => {
    const event = retag(signed(), "image", [
      ["image", "javascript:alert(1)"],
      ["image", "data:image/png;base64,abc"],
      ["image", "http://localhost/a.jpg"],
      ["image", "//example.com/a.jpg"],
      ["image", "https://example.com/safe.jpg"],
      ["image"],
    ]);
    expect(parseListing(event)?.images).toEqual([
      "https://example.com/safe.jpg",
    ]);
  });

  it.each(["-1", "Infinity", "NaN", "12oops", "0x10", "1e999"])(
    "rejects invalid numeric value %s",
    (value) => {
      for (const name of ["price", "bedrooms", "bathrooms", "area"]) {
        expect(
          parseListing(retag(signed(), name, [[name, value, "EUR"]])),
        ).toBeNull();
      }
    },
  );

  it("keeps missing numeric values null and accepts zero", () => {
    const empty = listing({
      price: "",
      bedrooms: "",
      bathrooms: "",
      area: "",
      latitude: " ",
      longitude: "",
    });
    expect([
      empty.price,
      empty.bedrooms,
      empty.bathrooms,
      empty.area,
      empty.latitude,
      empty.longitude,
    ]).toEqual([null, null, null, null, null, null]);
    expect(
      listing({ price: "0", latitude: "0", longitude: "0" }),
    ).toMatchObject({ price: 0, latitude: 0, longitude: 0 });
  });

  it("rejects out-of-range or unpaired coordinates", () => {
    expect(
      parseListing(retag(signed(), "latitude", [["latitude", "91"]])),
    ).toBeNull();
    expect(
      parseListing(retag(signed(), "longitude", [["longitude", "-181"]])),
    ).toBeNull();
    expect(
      parseListing(retag(signed(), "latitude", [["latitude", " "]])),
    ).toBeNull();
  });

  it("defaults missing status to active and preserves unknown status", () => {
    expect(parseListing(retag(signed(), "status", []))?.status).toBe("active");
    expect(
      parseListing(retag(signed(), "status", [["status", " Pending "]]))
        ?.status,
    ).toBe("pending");
  });
});

describe("latestListings", () => {
  it("selects newest per address independently of input order", () => {
    const old = signed({}, 100);
    const recent = signed({ title: "Updated" }, 200);
    const other = signed({}, 150, "other");
    expect(latestListings([recent, other, old]).map((item) => item.id)).toEqual(
      [recent.id, other.id],
    );
  });

  it("uses lowest id on equal timestamps in either order", () => {
    const a = signed({ title: "A" });
    const b = signed({ title: "B" });
    const expected = [a.id, b.id].sort()[0];
    expect(latestListings([a, b])[0].id).toBe(expected);
    expect(latestListings([b, a])[0].id).toBe(expected);
  });

  it.each(["sold", "rented", "withdrawn", "unknown"])(
    "does not resurrect an older listing after %s",
    (status) => {
      const update = retag(signed(), "status", [["status", status]], 200);
      expect(latestListings([signed(), update])).toEqual([]);
    },
  );

  it("does not resurrect an older listing after an invalid or unrelated update", () => {
    for (const name of ["title", "t", "price"]) {
      const invalid = retag(
        signed(),
        name,
        name === "title" ? [] : [[name, "invalid-value"]],
        200,
      );
      expect(latestListings([signed(), invalid])).toEqual([]);
    }
  });

  it("ignores forged signatures without hiding a verified listing", () => {
    const original = signed();
    const forged = { ...signed({}, 200), sig: "0".repeat(128) };
    expect(latestListings([original, forged]).map((item) => item.id)).toEqual([
      original.id,
    ]);
  });

  it("keeps identifiers and publishers separate", () => {
    const event = signed();
    const otherPublisher = finalizeEvent(
      {
        kind: 30402,
        created_at: 200,
        content: event.content,
        tags: event.tags,
      },
      generateSecretKey(),
    );
    expect(
      latestListings([event, signed({}, 150, "other"), otherPublisher]),
    ).toHaveLength(3);
  });
});

describe("filterListings", () => {
  it("filters one-time and recurring prices independently", () => {
    const sale = listing({ frequency: "" });
    const monthly = listing({
      transaction: "rent",
      price: "1500",
      frequency: "month",
    });
    const weekly = listing({
      transaction: "rent",
      price: "500",
      frequency: "week",
    });
    expect(
      filterListings([sale, monthly, weekly], { frequency: "once" }),
    ).toEqual([sale]);
    expect(
      filterListings([sale, monthly, weekly], { frequency: "month" }),
    ).toEqual([monthly]);
    expect(
      filterListings([sale, monthly, weekly], {
        currency: "EUR",
        minPrice: "1000",
      }),
    ).toEqual([]);
    expect(
      filterListings([sale, monthly, weekly], {
        currency: "EUR",
        minPrice: "1000",
        frequency: "month",
      }),
    ).toEqual([monthly]);
    expect(
      filterListings([sale, monthly, weekly], {
        currency: "EUR",
        minPrice: "1000",
        transaction: "sale",
      }),
    ).toEqual([sale]);
  });
  const euro = listing({
    title: "Caf\u00e9 home",
    location: "M\u00e1laga",
    country: "es",
    price: "100",
    bedrooms: "3",
  });
  const dollar = listing({ currency: "USD", price: "100" });
  const missing = listing({ price: "", bedrooms: "" });
  const all = [euro, dollar, missing];

  it("searches across fields ignoring accents, case and whitespace", () => {
    expect(filterListings(all, { query: "  CAFE   malaga " })).toEqual([euro]);
  });

  it("requires explicit exact currency for any price range", () => {
    expect(filterListings(all, { minPrice: "0" })).toEqual([]);
    expect(
      filterListings(all, {
        currency: "eur",
        frequency: "once",
        minPrice: "100",
        maxPrice: "100",
      }),
    ).toEqual([euro]);
    expect(filterListings(all, { currency: "US" })).toEqual([]);
    expect(filterListings(all, { currency: "USD" })).toEqual([dollar]);
  });

  it("excludes missing numeric values and applies minimum bedrooms", () => {
    expect(filterListings(all, { bedrooms: "3" })).toEqual([euro]);
    expect(
      filterListings(all, {
        currency: "EUR",
        frequency: "once",
        maxPrice: "100",
      }),
    ).toEqual([euro]);
  });

  it("combines categorical filters and rejects invalid ranges", () => {
    expect(
      filterListings(all, {
        transaction: "sale",
        propertyType: "apartment",
        country: "es",
      }),
    ).toEqual([euro]);
    expect(filterListings(all, { transaction: "rent" })).toEqual([]);
    expect(
      filterListings(all, {
        currency: "EUR",
        minPrice: "200",
        maxPrice: "100",
      }),
    ).toEqual([]);
    expect(filterListings(all, { bedrooms: "NaN" })).toEqual([]);
    expect(filterListings(all, { currency: "EUR", minPrice: "oops" })).toEqual(
      [],
    );
  });
});

describe("buildListingTags", () => {
  it("preserves small decimal crypto prices without scientific notation or rounding to zero", () => {
    const bitcoin = listing({ price: "0.00000001", currency: "BTC" });
    expect(bitcoin.price).toBe(0.00000001);
    expect(formatPrice(bitcoin)).toContain("0.00000001");
    const ether = listing({ price: "0.000000000000000001", currency: "ETH" });
    expect(ether.price).toBe(0.000000000000000001);
    expect(formatPrice(ether)).toContain("0.000000000000000001");
  });
  it("preserves supplied identifier and publication time across edits", () => {
    for (const values of [
      input,
      { ...input, title: "Edited", status: "sold" },
    ]) {
      const tags = buildListingTags(values, "stable:id", 42);
      expect(tags).toContainEqual(["d", "stable:id"]);
      expect(tags).toContainEqual(["published_at", "42"]);
      expect(tags).toContainEqual(["vastgoed_schema", "1"]);
      expect(tags).toContainEqual(["t", "real-estate"]);
      expect(tags).toContainEqual(["area", "85", "m2"]);
    }
  });

  it.each(["title", "description", "location", "currency"] as const)(
    "requires %s",
    (field) => {
      expect(() =>
        buildListingTags({ ...input, [field]: " " }, "home", 42),
      ).toThrow(field);
    },
  );

  it.each([
    { price: "-1" },
    { price: "Infinity" },
    { bedrooms: "no" },
    { bathrooms: "-1" },
    { area: "NaN" },
    { latitude: "91" },
    { longitude: "181" },
    { latitude: "" },
    { transaction: "swap" },
    { status: "pending" },
    { country: "Netherlands" },
    { currency: "EURO" },
    { images: ["http://localhost/image.jpg"] },
  ])("rejects invalid input %j", (overrides) => {
    expect(() =>
      buildListingTags({ ...input, ...overrides }, "home", 42),
    ).toThrow();
  });

  it("validates identifier and publication timestamp", () => {
    expect(() => buildListingTags(input, " ", 42)).toThrow("identifier");
    for (const time of [-1, 1.5, NaN, Infinity]) {
      expect(() => buildListingTags(input, "home", time)).toThrow(
        "publishedAt",
      );
    }
  });
});

describe("display helpers", () => {
  it("accepts only absolute HTTPS URLs without credentials", () => {
    expect(safeUrl(" https://example.com/image.jpg ")).toBe(
      "https://example.com/image.jpg",
    );
    for (const url of [
      "",
      "/image.jpg",
      "http://localhost/x",
      "javascript:alert(1)",
      "https://user:pass@example.com",
    ]) {
      expect(safeUrl(url)).toBeNull();
    }
  });

  it("formats currency, rental frequency, on-request prices and unknown currencies", () => {
    expect(formatPrice(listing({ price: "" }))).toBe("On request");
    expect(
      formatPrice(
        listing({ price: "1250", frequency: "month", transaction: "rent" }),
      ),
    ).toBe("\u20ac1,250 / month");
    expect(
      formatPrice({ ...listing(), currency: "not-a-currency", price: 1234 }),
    ).toBe("1,234 not-a-currency");
  });
});
