import { expect, test, type Page } from "@playwright/test";
import {
  finalizeEvent,
  matchFilter,
  verifyEvent,
  type Event,
  type Filter,
} from "nostr-tools";

const origin = "http://127.0.0.1:5173";
const imageOrigin = "https://property-images.example";
const styleURL = "https://tiles.openfreemap.org/styles/positron";
const architecture = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><rect width="800" height="520" fill="#dce6e4"/><path d="M0 390L800 350V520H0" fill="#8b9e88"/><path d="M140 380V190L420 90L660 200V380Z" fill="#eee7d6"/><path d="M120 200L420 70L680 200L660 220L420 110L140 220Z" fill="#455752"/><path d="M200 240H300V330H200ZM470 240H570V330H470Z" fill="#769b9c"/><path d="M350 250H420V380H350Z" fill="#596e60"/></svg>`;

async function mockPublicNetwork(page: Page, hold = false) {
  // A fixed test-only key and dates keep signatures, ordering and screenshots stable.
  const secret = new Uint8Array(32).fill(7);
  const homes = [
    [
      "Canal townhouse",
      "Utrecht",
      "425000",
      "EUR",
      "",
      "52.09",
      "5.12",
      "NL",
      "3",
    ],
    [
      "Harbour apartment",
      "Rotterdam",
      "1800",
      "EUR",
      "month",
      "51.92",
      "4.48",
      "NL",
      "2",
    ],
    [
      "Dune cottage",
      "The Hague",
      "650",
      "EUR",
      "week",
      "52.07",
      "4.30",
      "NL",
      "1",
    ],
    [
      "Garden residence",
      "London",
      "550000",
      "GBP",
      "",
      "51.50",
      "-0.12",
      "GB",
      "4",
    ],
    ["Courtyard studio", "Delft", "1200", "EUR", "month", "", "", "NL", "1"],
  ];
  const fixtures: Event[] = homes.map(
    (
      [
        title,
        location,
        price,
        currency,
        frequency,
        latitude,
        longitude,
        country,
        bedrooms,
      ],
      index,
    ) =>
      finalizeEvent(
        {
          kind: 30402,
          created_at: 1700000000 + index * 86400,
          content:
            "Test-only signed real estate listing. Contact the publisher independently.",
          tags: [
            ["d", `public-test-${index}`],
            ["t", "real-estate"],
            ["title", title],
            ["location", location],
            ["country", country],
            ["price", price, currency, frequency],
            ["transaction", frequency ? "rent" : "sale"],
            ["property_type", "house"],
            ["bedrooms", bedrooms],
            ["image", `${imageOrigin}/${index}.svg`],
            ...(latitude
              ? [
                  ["latitude", latitude],
                  ["longitude", longitude],
                ]
              : []),
          ],
        },
        secret,
      ),
  );
  fixtures.forEach((event) => expect(verifyEvent(event)).toBe(true));
  const requests: Filter[] = [];
  const publications: unknown[] = [];
  const websocketMessages: string[] = [];
  const httpRequests: { url: string; body: string | null }[] = [];
  let styleRequests = 0;
  const pending: (() => void)[] = [];

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    httpRequests.push({ url, body: request.postData() });
    if (new URL(url).origin === origin) return route.continue();
    if (new URL(url).origin === imageOrigin) {
      return route.fulfill({
        contentType: "image/svg+xml",
        body: architecture,
      });
    }
    if (url === styleURL) {
      styleRequests++;
      return route.fulfill({
        json: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "offline-background",
              type: "background",
              paint: { "background-color": "#e5ece6" },
            },
          ],
        },
      });
    }
    return route.abort();
  });
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    socket.onMessage((raw) => {
      websocketMessages.push(String(raw));
      const [type, subscription, ...filters] = JSON.parse(String(raw));
      if (type === "EVENT") {
        publications.push(subscription);
        return;
      }
      if (type !== "REQ") return;
      requests.push(...(filters as Filter[]));
      const respond = () => {
        const sent = new Set<string>();
        for (const filter of filters as Filter[]) {
          const matches = fixtures
            .filter((event) => matchFilter(filter, event))
            .sort(
              (a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id),
            )
            .slice(0, filter.limit ?? Infinity);
          for (const event of matches) {
            if (sent.has(event.id)) continue;
            socket.send(JSON.stringify(["EVENT", subscription, event]));
            sent.add(event.id);
          }
        }
        socket.send(JSON.stringify(["EOSE", subscription]));
      };
      if (hold) pending.push(respond);
      else respond();
    });
  });
  return {
    fixtures,
    secret,
    requests,
    publications,
    httpRequests,
    websocketMessages,
    get styleRequests() {
      return styleRequests;
    },
    release() {
      hold = false;
      pending.splice(0).forEach((respond) => respond());
    },
  };
}

async function populated(page: Page) {
  await expect(page.locator("[data-loaded-count]")).toHaveText("5");
  await expect(page.locator("[data-match-count]")).toHaveText("5");
  await expect(page.locator("#listing-grid")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".property-card")).toHaveCount(5);
}

async function screenshot(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(
        document.querySelectorAll<HTMLImageElement>(".property-card img"),
      ).map((image) => {
        image.loading = "eager";
        return image.decode();
      }),
    );
  });
  await page.screenshot({ path: test.info().outputPath(name), fullPage: true });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("desktop opens compact search above the fold with truthful counts and real map pins", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const network = await mockPublicNetwork(page, true);
  await page.goto("/");
  await expect(page.locator(".search-hero")).toHaveCount(0);
  await expect(page.locator("[data-loaded-count]")).toHaveText("0");
  await expect(page.locator("[data-match-count]")).toHaveText("0");
  await expect(page.locator("[data-mapped-count]")).toHaveText("0");
  await expect(page.locator("#search-form")).toBeVisible();
  await expect(page.locator("#property-map")).toBeVisible();
  const mapBox = await page.locator("#property-map").boundingBox();
  expect(mapBox).not.toBeNull();
  expect(mapBox!.y).toBeLessThan(page.viewportSize()!.height);
  await expect(page.locator("#toggle-filters")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator("#advanced-filters")).toBeHidden();
  network.release();
  await populated(page);
  await expect(page.locator("#result-count")).toHaveText(
    "5 matching properties / 5 active properties loaded",
  );
  await expect(page.locator("[data-mapped-count]")).toHaveText("4");
  await expect(
    page.locator("#property-map canvas.maplibregl-canvas"),
  ).toBeVisible();
  await expect(page.locator(".property-price-pin")).toHaveCount(4);
  await expect(
    page.locator(".property-price-pin").filter({ hasText: "1,200" }),
  ).toHaveCount(0);
  await expect.poll(() => network.styleRequests).toBe(1);
  await expect(page.locator("#map-feedback")).toBeHidden();
  await expect(page.locator(".search-layout")).toHaveAttribute(
    "data-view",
    "map",
  );
  for (const view of ["list", "map", "split"]) {
    await page.locator(`[data-search-view="${view}"]`).click();
    await expect(page.locator(".search-layout")).toHaveAttribute(
      "data-view",
      view,
    );
    await expect(page.locator(`[data-search-view="${view}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await noOverflow(page);
  await screenshot(page, "public-desktop.png");
  expect(network.publications).toEqual([]);
});

test("advanced currency, price, period and country filters stay local and reset", async ({
  page,
}) => {
  const network = await mockPublicNetwork(page);
  await page.goto("/");
  await populated(page);
  const requestCount = network.requests.length;
  await page.locator("#toggle-filters").click();
  await expect(page.locator("#toggle-filters")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  for (const label of [
    "Country code",
    "Currency",
    "Minimum price",
    "Maximum price",
    "Minimum bedrooms",
  ])
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Price period" }),
  ).toBeVisible();
  await page.getByLabel("Minimum price", { exact: true }).fill("1000");
  await page.getByLabel("Maximum price", { exact: true }).fill("2000");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator("#search-validation")).toContainText(
    "Choose a currency",
  );
  await page.getByLabel("Currency", { exact: true }).fill("EUR");
  await page.getByLabel("Country code").fill("NL");
  await page.getByLabel("Minimum bedrooms").fill("2");
  await page
    .getByRole("combobox", { name: "Price period" })
    .selectOption("month");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator("#search-validation")).toBeHidden();
  await expect(page.locator(".property-card h3")).toHaveText([
    "Harbour apartment",
  ]);
  await expect(page.locator("[data-match-count]")).toHaveText("1");
  await expect(page.locator("[data-loaded-count]")).toHaveText("5");
  await expect(page.locator("[data-mapped-count]")).toHaveText("1");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await populated(page);
  await page
    .getByRole("combobox", { name: "Price period" })
    .selectOption("week");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".property-card h3")).toHaveText(["Dune cottage"]);
  await page
    .getByRole("combobox", { name: "Price period" })
    .selectOption("once");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".property-card h3")).toHaveText([
    "Garden residence",
    "Canal townhouse",
  ]);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await populated(page);
  expect(network.requests.length).toBe(requestCount);
  expect(network.publications).toEqual([]);
});

test("sort reverses signed fixture dates without querying relays", async ({
  page,
}) => {
  const network = await mockPublicNetwork(page);
  await page.goto("/");
  await populated(page);
  const requests = network.requests.length;
  const newest = [...network.fixtures]
    .sort((a, b) => b.created_at - a.created_at)
    .map((event) => event.tags.find(([name]) => name === "title")![1]);
  await expect(page.locator(".property-card h3")).toHaveText(newest);
  await page.getByLabel("Sort", { exact: true }).selectOption("oldest");
  await expect(page.locator(".property-card h3")).toHaveText(
    [...newest].reverse(),
  );
  await page.getByLabel("Sort", { exact: true }).selectOption("newest");
  await expect(page.locator(".property-card h3")).toHaveText(newest);
  expect(network.requests.length).toBe(requests);
});

test("390px search defaults to map above cards and switches views without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPublicNetwork(page);
  await page.goto("/");
  await populated(page);
  await expect(page.locator(".search-layout")).toHaveAttribute(
    "data-view",
    "map",
  );
  await expect(page.locator('[data-search-view="map"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".results-panel")).toBeVisible();
  await expect(page.locator(".map-panel")).toBeVisible();
  await noOverflow(page);
  await screenshot(page, "public-mobile.png");
  await page.locator('[data-search-view="map"]').click();
  await expect(page.locator(".search-layout")).toHaveAttribute(
    "data-view",
    "map",
  );
  await expect(page.locator(".results-panel")).toBeVisible();
  await expect(page.locator("#property-map canvas")).toBeVisible();
  await expect(page.locator(".property-price-pin")).toHaveCount(4);
  await noOverflow(page);
  await page.locator('[data-search-view="list"]').click();
  await expect(page.locator(".search-layout")).toHaveAttribute(
    "data-view",
    "list",
  );
  await expect(page.locator(".results-panel")).toBeVisible();
  await expect(page.locator(".map-panel")).toBeHidden();
});

test("free publishing links open the guest editor without an account gate", async ({
  page,
}) => {
  const network = await mockPublicNetwork(page);
  await page.goto("/");
  await populated(page);
  const links = page.locator('a[href="/dashboard/#editor"]');
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    await expect(link).toBeVisible();
    await expect(link).toContainText(/free/i);
  }
  await expect(page.locator("#newsletter")).toBeVisible();
  await links.first().click();
  await expect(page).toHaveURL(`${origin}/dashboard/#editor`);
  await expect(page.locator("body")).toHaveClass(/dashboard-client/);
  await expect(
    page.getByRole("complementary", { name: "Client sidebar" }),
  ).toBeAttached();
  await expect(page.locator("#listing-form")).toBeVisible();
  await expect(page.locator("#npub-login")).toBeHidden();
  await expect(page.locator("#dashboard-connect")).toBeHidden();
  await expect(
    page.locator(
      '#listing-form input[type="email"], #listing-form input[name="npub"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator("#choose-extension")).toBeVisible();
  await expect(page.locator("#generate-listing-key")).toBeVisible();
  expect(network.publications).toEqual([]);
});

test("preview email submission creates no subscription and never sends the email", async ({
  page,
}) => {
  const network = await mockPublicNetwork(page);
  await page.goto("/");
  await populated(page);
  const form = page.locator("[data-preview-newsletter]");
  const email = "public-preview-only@example.com";
  await expect(
    form.locator('input[type="email"][data-members-email]'),
  ).toHaveAttribute("required", "");
  await form.getByLabel("Email address").fill(email);
  const before = network.httpRequests.length;
  await form.getByRole("button", { name: "Join the email list" }).click();
  await expect(form.getByRole("status")).toHaveText(
    "Email signup requires the live Vastgoed site. No subscription was created in this local preview.",
  );
  await expect(page).toHaveURL(`${origin}/`);
  expect(
    network.httpRequests
      .slice(before)
      .filter((request) => request.body !== null),
  ).toEqual([]);
  expect(
    network.httpRequests.some((request) =>
      `${request.url} ${request.body}`.includes(email),
    ),
  ).toBe(false);
  expect(JSON.stringify(network.requests)).not.toContain(email);
  expect(network.websocketMessages.join(" ")).not.toContain(email);
  expect(network.publications).toEqual([]);
});

test("signed titles remain text, signatures do not imply verified ownership, and broken images fall back", async ({
  page,
}) => {
  const network = await mockPublicNetwork(page);
  const title = '<img src=x onerror="window.__publicXss=true"> Canal townhouse';
  const original = network.fixtures[0];
  network.fixtures[0] = finalizeEvent(
    {
      kind: original.kind,
      created_at: original.created_at,
      content: original.content,
      tags: original.tags.map((tag) =>
        tag[0] === "title" ? ["title", title] : tag,
      ),
    },
    network.secret,
  );
  await page.route(`${imageOrigin}/0.svg`, (route) => route.abort());
  await page.goto("/");
  await populated(page);
  await page.getByLabel("City, region or keywords").fill("Utrecht");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".property-card h3")).toHaveText(title);
  await expect(page.locator(".property-card h3 img")).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__publicXss")),
  ).toBeUndefined();
  await expect(page.locator(".property-card .image-placeholder")).toHaveText(
    "Photograph unavailable",
  );
  await expect(page.locator(".search-disclaimer")).toContainText(
    "A signature does not verify property ownership.",
  );
  await expect(page.locator(".property-card")).not.toContainText(
    /verified|ownership confirmed/i,
  );
  expect(network.publications).toEqual([]);
});
