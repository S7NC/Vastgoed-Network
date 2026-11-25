import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  matchFilter,
  nip19,
  verifyEvent,
  type Event,
  type EventTemplate,
  type Filter,
} from "nostr-tools";

async function mockNetwork(page: Page, connected = false) {
  const secret = generateSecretKey();
  const pubkey = getPublicKey(secret);
  const fixtures: Event[] = [
    finalizeEvent(
      {
        kind: 0,
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({ name: "Browser Publisher" }),
      },
      secret,
    ),
  ];
  const published = new Map<string, Event>();
  const relayPublications: string[] = [];
  const controls = { rejectAcknowledgements: false };
  const requests: Filter[] = [];
  const relayFixtures = new Map<string, Event[]>();
  const relayRequests: { relay: string; filter: Filter }[] = [];

  // Never contact public relays, tile servers, or other external HTTP services.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:5173"
      ? route.continue()
      : route.abort(),
  );
  // A RegExp matches the actual wss: URL, without glob slash ambiguity.
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    socket.onMessage((raw) => {
      const [type, value, ...filters] = JSON.parse(String(raw));
      if (type === "REQ") {
        const sent = new Set<string>();
        for (const filter of filters as Filter[]) {
          requests.push(filter);
          const relay = socket.url().replace(/\/$/, "");
          relayRequests.push({ relay, filter });
          const matches = [
            ...fixtures,
            ...(relayFixtures.get(relay) ?? []),
            ...published.values(),
          ]
            .filter((event) => matchFilter(filter, event))
            .sort(
              (a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id),
            )
            .slice(0, filter.limit ?? Infinity);
          for (const event of matches) {
            if (!sent.has(event.id)) {
              socket.send(JSON.stringify(["EVENT", value, event]));
              sent.add(event.id);
            }
          }
        }
        socket.send(JSON.stringify(["EOSE", value]));
      } else if (type === "EVENT") {
        relayPublications.push(socket.url().replace(/\/$/, ""));
        const event = value as Event;
        const valid = verifyEvent(event);
        if (valid) published.set(event.id, event);
        socket.send(
          JSON.stringify([
            "OK",
            event.id,
            valid && !controls.rejectAcknowledgements,
            controls.rejectAcknowledgements
              ? "simulated lost acknowledgement"
              : valid
                ? ""
                : "invalid signature",
          ]),
        );
      }
    });
  });

  if (connected) {
    await page.exposeFunction("nostrSign", (template: EventTemplate) =>
      finalizeEvent(template, secret),
    );
    await page.addInitScript((key) => {
      const browser = window as unknown as {
        nostr: {
          getPublicKey(): Promise<string>;
          signEvent(template: EventTemplate): Promise<Event>;
        };
        nostrSign(template: EventTemplate): Promise<Event>;
      };
      browser.nostr = {
        getPublicKey: async () => key,
        signEvent: (template) => browser.nostrSign(template),
      };
    }, pubkey);
  }

  return {
    fixtures,
    published,
    requests,
    secret,
    pubkey,
    controls,
    relayFixtures,
    relayRequests,
    relayPublications,
  };
}

async function connectDashboard(page: Page) {
  await page.goto("/?page=dashboard");
  await page.locator(".client-account-name").waitFor({ state: "attached" });
  if (await page.locator("#dashboard-connect").isVisible())
    await page.locator("#dashboard-connect").click();
  await expect(page.locator(".client-account-name")).toHaveText(
    "Browser Publisher",
  );
  await expect(page.locator(".client-status")).toHaveText(
    /^\d+ listings? loaded$/,
  );
  await expect(
    page.getByRole("heading", { name: "My Listings", exact: true }).first(),
  ).toBeVisible();
}

function seedOwnerListing(network: Awaited<ReturnType<typeof mockNetwork>>) {
  const { fixtures, relayFixtures, secret } = network;
  fixtures.push(
    finalizeEvent(
      {
        kind: 0,
        created_at: 1699999999,
        tags: [],
        content: JSON.stringify({ name: "Old publisher" }),
      },
      secret,
    ),
    finalizeEvent(
      {
        kind: 10002,
        created_at: 1699999999,
        tags: [["r", "wss://stale.example", "write"]],
        content: "",
      },
      secret,
    ),
    finalizeEvent(
      {
        kind: 10002,
        created_at: 1700000000,
        tags: [
          ["r", "wss://owner.example", "write"],
          ["r", "wss://read.example", "read"],
        ],
        content: "",
      },
      secret,
    ),
  );
  const listing = finalizeEvent(
    {
      kind: 30402,
      created_at: 1700000000,
      tags: [
        ["d", "owner-only-home"],
        ["title", "Owner relay house"],
        ["location", "Delft"],
        ["price", "325000", "EUR"],
        ["custom", "preserve me"],
      ],
      content: "Existing home from another Nostr client.",
    },
    secret,
  );
  relayFixtures.set("wss://owner.example", [listing]);
  return listing;
}

test("anonymous dashboard explains the missing signing extension", async ({
  page,
}) => {
  await mockNetwork(page);
  await page.goto("/?page=dashboard");
  await expect(
    page.getByRole("heading", { name: "Your listings. Your identity." }),
  ).toBeVisible();
  await expect(page.locator("#listing-form")).toBeHidden();
  await page.locator("#dashboard-connect").click();
  await expect(page.locator("#app-message")).toContainText(
    "Install a NIP-07 browser extension",
  );
  await expect(page.locator("[data-identity]")).toHaveText("Not connected");
});

test("signed listing is acknowledged and a second edit preserves its address", async ({
  page,
}) => {
  const { published, pubkey } = await mockNetwork(page, true);
  await connectDashboard(page);
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  const form = page.locator("#listing-form");
  await form.getByLabel("Title", { exact: true }).fill("Canal house");
  await form
    .getByLabel("Location", { exact: true })
    .fill("Utrecht, Netherlands");
  await form
    .getByLabel("Description / public contact details")
    .fill("A sunny home. Contact the publisher.");
  await expect(form.getByLabel("Currency code")).toHaveValue("EUR");
  await form.getByRole("button", { name: "Sign and publish" }).click();
  await expect(page.locator("#app-message")).toContainText(
    "3/3 relays acknowledged.",
  );
  expect(published.size).toBe(1);
  const original = [...published.values()][0];
  expect(verifyEvent(original)).toBe(true);
  expect(original.pubkey).toBe(pubkey);
  expect(original.kind).toBe(30402);
  expect(original.tags).toContainEqual(["t", "real-estate"]);
  const identifier = original.tags.find(([name]) => name === "d");
  expect(identifier?.[1]).toBeTruthy();
  expect(original.content).toBe("A sunny home. Contact the publisher.");

  await page.getByRole("button", { name: "Refresh from relays" }).click();
  await expect(page.locator(".client-status")).toHaveText("1 listing loaded");
  await expect(page).toHaveURL(/#editor$/);
  await page.getByRole("link", { name: "My Listings", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edit property" }),
  ).toBeVisible();
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue(
    "Canal house",
  );
  await form.getByLabel("Title", { exact: true }).fill("Updated canal house");
  await form.getByRole("button", { name: "Sign and publish" }).click();
  await expect.poll(() => published.size).toBe(2);
  await expect(page.locator("#app-message")).toContainText(
    "3/3 relays acknowledged.",
  );
  const updated = [...published.values()][1];
  expect(verifyEvent(updated)).toBe(true);
  expect(updated.kind).toBe(30402);
  expect(updated.tags).toContainEqual(identifier);
  expect(updated.tags).toContainEqual(["t", "real-estate"]);
  expect(updated.tags).toContainEqual(["title", "Updated canal house"]);
  expect(updated.created_at).toBeGreaterThan(original.created_at);
});

test("local draft survives a reload and restores without publishing", async ({
  page,
}) => {
  const { published } = await mockNetwork(page, true);
  await connectDashboard(page);
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  const form = page.locator("#listing-form");
  await form.getByLabel("Title", { exact: true }).fill("Device-only draft");
  await form.getByLabel("Location", { exact: true }).fill("Rotterdam");
  await form
    .getByLabel("Description / public contact details")
    .fill("Draft description");
  await form.getByRole("button", { name: "Save local draft" }).click();
  await expect(page.locator("#app-message")).toHaveText(
    "Draft saved on this browser only.",
  );
  await connectDashboard(page);
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue("");
  await form.getByRole("button", { name: "Restore local draft" }).click();
  await expect(page.locator("#app-message")).toHaveText(
    "Local draft restored. Review before publishing.",
  );
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue(
    "Device-only draft",
  );
  await expect(form.getByLabel("Location", { exact: true })).toHaveValue(
    "Rotterdam",
  );
  await expect(
    form.getByLabel("Description / public contact details"),
  ).toHaveValue("Draft description");
  await expect(form.getByLabel("Currency code")).toHaveValue("EUR");
  expect(published.size).toBe(0);
});

test("a lost acknowledgement keeps the listing address stable on resubmission", async ({
  page,
}) => {
  const { published, controls } = await mockNetwork(page, true);
  await connectDashboard(page);
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  const form = page.locator("#listing-form");
  await form.getByLabel("Title", { exact: true }).fill("Retry house");
  await form.getByLabel("Location", { exact: true }).fill("Lisbon");
  await form
    .getByLabel("Description / public contact details")
    .fill("A public listing.");
  controls.rejectAcknowledgements = true;
  await form.getByRole("button", { name: "Sign and publish" }).click();
  await expect(page.locator("#app-message")).toContainText(
    "No relay acknowledged",
  );
  await expect(page.locator("#retry-publish")).toBeVisible();
  const original = [...published.values()][0];
  controls.rejectAcknowledgements = false;
  await form.getByLabel("Title", { exact: true }).fill("Retry house updated");
  await form.getByRole("button", { name: "Sign and publish" }).click();
  await expect(page.locator("#app-message")).toContainText(
    "3/3 relays acknowledged",
  );
  expect(published.size).toBe(2);
  expect([...published.values()][1].tags).toContainEqual(
    original.tags.find((tag) => tag[0] === "d"),
  );
});

test("profile publication preserves metadata outside the editor", async ({
  page,
}) => {
  const { fixtures, secret, published } = await mockNetwork(page, true);
  fixtures[0] = finalizeEvent(
    {
      kind: 0,
      created_at: 1700000000,
      tags: [],
      content: JSON.stringify({
        name: "Browser Publisher",
        nip05: "agent@example.com",
        lud16: "tips@example.com",
        custom: { preserved: true },
      }),
    },
    secret,
  );
  await connectDashboard(page);
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.locator('#profile-form [name="name"]').fill("Updated publisher");
  await page.getByRole("button", { name: "Sign profile update" }).click();
  await expect(page.locator("#app-message")).toContainText(
    "3/3 relays acknowledged",
  );
  const update = [...published.values()][0];
  expect(update.kind).toBe(0);
  expect(JSON.parse(update.content)).toMatchObject({
    name: "Updated publisher",
    nip05: "agent@example.com",
    lud16: "tips@example.com",
    custom: { preserved: true },
  });
});

test("Blossom upload signs the re-encoded image hash and adds its public URL", async ({
  page,
}) => {
  const { pubkey } = await mockNetwork(page, true);
  let uploaded = false;
  await page.route("https://blossom.primal.net/upload", async (route) => {
    const request = route.request();
    const body = request.postDataBuffer()!;
    const hash = createHash("sha256").update(body).digest("hex");
    const auth = JSON.parse(
      Buffer.from(
        request.headers().authorization.replace(/^Nostr /, ""),
        "base64",
      ).toString(),
    );
    expect(verifyEvent(auth)).toBe(true);
    expect(auth.pubkey).toBe(pubkey);
    expect(auth.kind).toBe(24242);
    expect(auth.tags).toContainEqual(["x", hash]);
    expect(auth.tags).toContainEqual(["t", "upload"]);
    expect(request.headers()["content-type"]).toBe("image/webp");
    uploaded = true;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        sha256: hash,
        url: `https://blossom.primal.net/${hash}.webp`,
        type: "image/webp",
        size: body.length,
        uploaded: Math.floor(Date.now() / 1000),
      }),
    });
  });
  await connectDashboard(page);
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    canvas.getContext("2d")!.fillRect(0, 0, 20, 20);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#image-upload").setInputFiles({
    name: "property.png",
    mimeType: "image/png",
    buffer: Buffer.from(png, "base64"),
  });
  await expect(page.locator("#app-message")).toContainText(
    "Photograph uploaded.",
  );
  expect(uploaded).toBe(true);
  await expect(page.locator('#listing-form [name="images"]')).toHaveValue(
    /^https:\/\/blossom.primal.net\/[a-f0-9]{64}\.webp$/,
  );
});

test("search discovers signed fixtures, filters locally, and escapes listing titles", async ({
  page,
}) => {
  const { fixtures, secret, requests } = await mockNetwork(page);
  const unsafeTitle =
    '<img src=x onerror="window.__listingXss=true"> Canal apartment';
  for (const [identifier, title, location] of [
    ["canal", unsafeTitle, "Amsterdam"],
    ["garden", "Garden house", "Rotterdam"],
  ]) {
    fixtures.push(
      finalizeEvent(
        {
          kind: 30402,
          created_at: 1700000000,
          content: "A signed property fixture",
          tags: [
            ["d", identifier],
            ["t", "real-estate"],
            ["title", title],
            ["location", location],
          ],
        },
        secret,
      ),
    );
  }
  await page.goto("/?page=search");
  await expect(page.locator("#result-count")).toHaveText(
    "2 matching properties / 2 active properties loaded",
  );
  await expect(page.locator(".property-card")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: unsafeTitle, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".property-card h3 img")).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__listingXss")),
  ).toBeUndefined();
  const requestCount = requests.length;
  await page.getByLabel("City, region or keywords").fill("Amsterdam");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".property-card")).toHaveCount(1);
  await expect(page.locator("#result-count")).toHaveText(
    "1 matching properties / 2 active properties loaded",
  );
  await expect(page.locator(".property-card h3")).toHaveText(unsafeTitle);
  expect(requests.length).toBe(requestCount);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".property-card")).toHaveCount(2);
});

test("mobile search and connected dashboard have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockNetwork(page, true);
  await page.goto("/?page=search");
  await expect(page.locator("#result-count")).toHaveText(
    "0 matching properties / 0 active properties loaded",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await connectDashboard(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator("#client-menu")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.locator("#client-menu")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator("#profile-form")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("npub login discovers an untagged owner-relay listing but cannot sign edits", async ({
  page,
}) => {
  const network = await mockNetwork(page);
  const original = seedOwnerListing(network);
  await page.goto("/dashboard/");
  expect(
    await page.evaluate(() => Reflect.get(window, "nostr")),
  ).toBeUndefined();
  await page
    .locator('#npub-login [name="npub"]')
    .fill(nip19.npubEncode(network.pubkey));
  await page.getByRole("button", { name: "Load my listings" }).click();
  await expect(page.locator(".client-account-name")).toHaveText(
    "Browser Publisher",
  );
  await expect(page.locator(".client-status")).toHaveText("1 listing loaded");
  await expect(page.locator('[data-client-view="listings"]')).toBeVisible();
  await expect(page.locator(".client-property-row")).toContainText(
    "Owner relay house",
  );
  expect(
    original.tags.some(([name]) => name === "t" || name === "vastgoed_schema"),
  ).toBe(false);
  expect(network.relayRequests).toContainEqual({
    relay: "wss://owner.example",
    filter: { authors: [network.pubkey], kinds: [30402], limit: 300 },
  });
  expect(
    network.relayRequests.some(
      ({ relay }) =>
        relay === "wss://read.example" || relay === "wss://stale.example",
    ),
  ).toBe(false);
  await expect(page.locator(".search-hero")).toBeHidden();
  await page.screenshot({
    path: test.info().outputPath("dashboard-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.locator("#listing-form");
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue(
    "Owner relay house",
  );
  await expect(page.locator("#generate-listing-key")).toBeDisabled();
  await expect(form.getByLabel("Location", { exact: true })).toHaveValue(
    "Delft",
  );
  await expect(
    form.getByLabel("Description / public contact details"),
  ).toHaveValue(original.content);
  await form.getByLabel("Title", { exact: true }).fill("Unsigned owner edit");
  await form.getByRole("button", { name: "Save local draft" }).click();
  await expect(page.locator("#app-message")).toHaveText(
    "Draft saved on this browser only.",
  );
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  await form.getByRole("button", { name: "Restore local draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit property", exact: true }),
  ).toBeVisible();
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue(
    "Unsigned owner edit",
  );
  await form.getByRole("button", { name: "Sign and publish" }).click();
  await expect(page.locator("#app-message")).toContainText("Install a NIP-07");
  expect(network.published.size).toBe(0);
});

test("extension signs an edit of the owner-only listing with its original address", async ({
  page,
}) => {
  const network = await mockNetwork(page, true);
  const original = seedOwnerListing(network);
  await connectDashboard(page);
  await expect(page.locator(".client-property-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.locator("#listing-form");
  await expect(form.getByLabel("Title", { exact: true })).toHaveValue(
    "Owner relay house",
  );
  await form
    .getByLabel("Title", { exact: true })
    .fill("Updated owner relay house");
  await form.getByRole("button", { name: "Sign and publish" }).click();
  await expect(page.locator("#app-message")).toContainText(
    "4/4 relays acknowledged",
  );
  expect(network.published.size).toBe(1);
  const updated = [...network.published.values()][0];
  expect(verifyEvent(updated)).toBe(true);
  expect(updated.pubkey).toBe(original.pubkey);
  expect(updated.kind).toBe(30402);
  expect(updated.tags).toContainEqual(
    original.tags.find(([name]) => name === "d"),
  );
  expect(updated.tags).toContainEqual(["custom", "preserve me"]);
  expect(updated.tags).toContainEqual(["title", "Updated owner relay house"]);
  expect(updated.created_at).toBeGreaterThan(original.created_at);
  expect(updated.content).toBe(original.content);
  expect(network.relayPublications).toContain("wss://owner.example");
  expect(
    network.relayRequests.some(({ relay }) => relay === "wss://owner.example"),
  ).toBe(true);
  expect(
    network.relayRequests.some(
      ({ relay }) =>
        relay === "wss://read.example" || relay === "wss://stale.example",
    ),
  ).toBe(false);
});

test("direct profile hash, browser back, and disconnect reset the workspace", async ({
  page,
}) => {
  await mockNetwork(page, true);
  await page.goto("/?page=dashboard#profile");
  await page.locator("#dashboard-connect").click();
  await expect(page.locator(".client-status")).toHaveText("0 listings loaded");
  await expect(page.locator("#profile-form")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Profile", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "New Listing", exact: true }).click();
  await expect(page.locator("#listing-form")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#profile$/);
  await expect(page.locator("#profile-form")).toBeVisible();
  await expect(page.locator("#listing-form")).toBeHidden();
  await page
    .getByRole("button", { name: "Switch account / Disconnect" })
    .click();
  await expect(page.locator(".client-account-name")).toHaveText(
    "Not connected",
  );
  await expect(page.locator("[data-identity]")).toHaveText("Not connected");
  await expect(page.locator("#npub-login")).toBeVisible();
  await expect(page.locator("#profile-form")).toBeHidden();
  await expect(page.locator("#listing-form")).toBeHidden();
  expect(
    await page.evaluate(() => sessionStorage.getItem("vastgoed-pubkey")),
  ).toBeNull();
});

test("invalid npub and nsec login are rejected without relay queries or publication", async ({
  page,
}) => {
  const { secret, requests, published } = await mockNetwork(page);
  await page.goto("/?page=dashboard");
  const requestCount = requests.length;
  for (const [value, error] of [
    ["npub1invalid", "Enter a valid public npub. Never enter a private key."],
    [
      nip19.nsecEncode(secret),
      "Enter a public npub, not an nsec or another Nostr identifier.",
    ],
  ]) {
    await page.locator('#npub-login [name="npub"]').fill(value);
    await page.getByRole("button", { name: "Load my listings" }).click();
    await expect(page.locator("#app-message")).toHaveText(error);
    await expect(page.locator(".client-account-name")).toHaveText(
      "Not connected",
    );
    expect(requests.length).toBe(requestCount);
    expect(published.size).toBe(0);
  }
});

test("existing listing detail follows the owner relay hint without a site tag", async ({
  page,
}) => {
  const network = await mockNetwork(page);
  seedOwnerListing(network);
  await page.goto("/dashboard/");
  await page
    .locator('#npub-login [name="npub"]')
    .fill(nip19.npubEncode(network.pubkey));
  await page.getByRole("button", { name: "Load my listings" }).click();
  await expect(page.locator(".client-status")).toHaveText("1 listing loaded");
  await page.getByRole("link", { name: "View", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Owner relay house", exact: true }),
  ).toBeVisible();
  expect(network.relayRequests).toContainEqual({
    relay: "wss://owner.example",
    filter: {
      kinds: [30402],
      authors: [network.pubkey],
      "#d": ["owner-only-home"],
      limit: 20,
    },
  });
});

test("an extension with a different key cannot publish edits for a supplied npub", async ({
  page,
}) => {
  const network = await mockNetwork(page, true);
  const ownerSecret = generateSecretKey();
  const owner = getPublicKey(ownerSecret);
  network.fixtures.push(
    finalizeEvent(
      {
        kind: 30402,
        created_at: 1700000000,
        tags: [
          ["d", "another-owner"],
          ["title", "Another owner house"],
          ["location", "Brussels"],
          ["price", "250000", "EUR"],
        ],
        content: "Public property owned by another key.",
      },
      ownerSecret,
    ),
  );
  await page.goto("/dashboard/");
  await page.locator('#npub-login [name="npub"]').fill(nip19.npubEncode(owner));
  await page.getByRole("button", { name: "Load my listings" }).click();
  await expect(page.locator(".client-status")).toHaveText("1 listing loaded");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Sign and publish" }).click();
  await expect(page.locator("#app-message")).toContainText(
    "unexpected or invalid signed event",
  );
  expect(network.published.size).toBe(0);
});
