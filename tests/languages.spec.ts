import { expect, test, type Page } from "@playwright/test";
import {
  finalizeEvent,
  getPublicKey,
  matchFilter,
  nip19,
  verifyEvent,
  type Event,
  type Filter,
} from "nostr-tools";
import nl from "../src/locales/nl";
import fr from "../src/locales/fr";
import de from "../src/locales/de";

type Language = "en" | "nl" | "fr" | "de";
const catalogs = { en: {}, nl, fr, de };
const languageNames = {
  en: "English",
  nl: "Nederlands",
  fr: "Français",
  de: "Deutsch",
};
const text = (language: Language, source: string) =>
  (catalogs[language] as Record<string, string>)[source] ?? source;
const origin = "http://127.0.0.1:5173";
const images = "https://language-images.example";
const unsafeTitle = '<img src=x onerror="window.__languageXss=true"> House';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect width="800" height="520" fill="#dce6e4"/><path d="M140 400V200L400 70L660 200V400Z" fill="#eee7d6"/><path d="M320 400V260H460V400" fill="#455752"/></svg>';

async function network(
  page: Page,
  hosted = false,
  membershipState:
    "subscribe" | "member" | "invite-only" | "disabled" = "subscribe",
) {
  const secret = new Uint8Array(32).fill(19);
  const pubkey = getPublicKey(secret);
  const fixtures: Event[] = [
    finalizeEvent(
      {
        kind: 0,
        created_at: 1700000000,
        tags: [],
        content: JSON.stringify({
          name: "Profile",
          picture: `${images}/avatar.svg`,
        }),
      },
      secret,
    ),
    ...["House", unsafeTitle].map((title, index) =>
      finalizeEvent(
        {
          kind: 30402,
          created_at: 1700000001 + index,
          content: "Profile",
          tags: [
            ["d", `language-${index}`],
            ["t", "real-estate"],
            ["title", title],
            ["location", "Delft"],
            ["price", "425000.5", "EUR"],
            ["transaction", "sale"],
            ...[0, 1, 2].map((photo) => [
              "image",
              `${images}/${index}-${photo}.svg`,
            ]),
            ...(index === 0
              ? [
                  ["latitude", "52.01"],
                  ["longitude", "4.36"],
                ]
              : []),
          ],
        },
        secret,
      ),
    ),
  ];
  fixtures.forEach((event) => expect(verifyEvent(event)).toBe(true));
  const http: { url: string; method: string; body: string | null }[] = [];
  const messages: string[] = [];
  const publications: unknown[] = [];
  const requests: Filter[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    http.push({
      url: url.href,
      method: request.method(),
      body: request.postData(),
    });
    if (url.origin === origin) {
      // Install a real server-rendered node and listener before the app module runs.
      if (hosted && request.isNavigationRequest()) {
        const response = await route.fetch();
        const membership =
          membershipState === "member"
            ? '<p data-i18n="You are signed in.">You are signed in.</p><a href="#/portal/account" data-i18n="Membership account">Membership account</a>'
            : membershipState === "invite-only"
              ? '<p data-i18n="Membership is invitation only. Existing members can sign in.">Membership is invitation only. Existing members can sign in.</p><a href="#/portal/signin" data-i18n="Sign in">Sign in</a>'
              : membershipState === "disabled"
                ? '<p data-i18n="Membership is not enabled on this site.">Membership is not enabled on this site.</p>'
                : '<form data-members-form="subscribe"><label>Email address<input type="email" name="email" data-members-email required></label><button type="submit">Sign up for the newsletter</button></form><a href="#/portal/signin" data-i18n="Sign in">Sign in</a>';
        const html = (await response.text()).replace(
          "<body>",
          `<body><section id="ghost-dashboard-membership" data-membership-state="${membershipState}" hidden><h2 data-i18n="Newsletter & membership">Newsletter &amp; membership</h2>${membership}<p data-i18n="Your membership is separate from your Nostr identity.">Your membership is separate from your Nostr identity.</p></section><script>window.__submits=0;window.__membership=document.getElementById('ghost-dashboard-membership');window.__memberForm=window.__membership.querySelector('form');window.__memberForm?.addEventListener('submit',function(event){event.preventDefault();window.__submits++;});</script>`,
        );
        return route.fulfill({ response, body: html });
      }
      return route.continue();
    }
    if (url.origin === images)
      return route.fulfill({ contentType: "image/svg+xml", body: svg });
    if (url.href === "https://tiles.openfreemap.org/styles/positron")
      return route.fulfill({
        json: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "offline",
              type: "background",
              paint: { "background-color": "#e5ece6" },
            },
          ],
        },
      });
    return route.abort();
  });
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    socket.onMessage((raw) => {
      messages.push(String(raw));
      const [type, subscription, ...filters] = JSON.parse(String(raw));
      if (type === "EVENT") {
        publications.push(subscription);
        return;
      }
      if (type !== "REQ") return;
      const sent = new Set<string>();
      for (const filter of filters as Filter[]) {
        requests.push(filter);
        for (const event of fixtures
          .filter((event) => matchFilter(filter, event))
          .sort(
            (a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id),
          )
          .slice(0, filter.limit ?? Infinity)) {
          if (sent.has(event.id)) continue;
          sent.add(event.id);
          socket.send(JSON.stringify(["EVENT", subscription, event]));
        }
      }
      socket.send(JSON.stringify(["EOSE", subscription]));
    });
  });
  return { pubkey, http, messages, publications, requests };
}

async function selectLanguage(page: Page, language: Language) {
  await revealLanguage(page);
  await page.locator(`[data-language-button="${language}"]:visible`).click();
  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(
    page.locator(`[data-language-button="${language}"]`).first(),
  ).toHaveAttribute("aria-pressed", "true");
  await closePublicMenu(page);
}

async function closePublicMenu(page: Page) {
  const toggle = page.locator("#site-menu-toggle");
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) === "true"
  ) {
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
}

async function revealLanguage(page: Page) {
  await page
    .locator("[data-language-button]")
    .first()
    .waitFor({ state: "attached" });
  if (await page.locator("[data-language-button]:visible").count()) return;
  const toggle = page.locator("#site-menu-toggle");
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true")
      await toggle.click();
  } else if (await page.locator("#client-menu").isVisible()) {
    const menu = page.locator("#client-menu");
    if ((await menu.getAttribute("aria-expanded")) !== "true")
      await menu.click();
  }
  await expect(page.locator("[data-language-button]:visible")).toHaveCount(4);
}

async function openPublicMenu(page: Page) {
  const toggle = page.locator("#site-menu-toggle");
  if (
    (await toggle.isVisible()) &&
    (await toggle.getAttribute("aria-expanded")) !== "true"
  )
    await toggle.click();
}

async function controls(page: Page, dashboard = false) {
  await revealLanguage(page);
  const root = page.locator(dashboard ? ".client-sidebar" : ".site-header");
  await expect(root.locator("[data-language-button]:visible")).toHaveCount(4);
  await expect(
    root.locator('[data-language-button][aria-pressed="true"]'),
  ).toHaveCount(1);
  const active = await page.locator("html").getAttribute("lang");
  for (const language of ["en", "nl", "fr", "de"] as const) {
    const button = root.locator(`[data-language-button="${language}"]`);
    await expect(button).toBeVisible();
    await expect(button).toHaveRole("button");
    await expect(button).toHaveAccessibleName(languageNames[language]);
    await expect(button).toHaveAttribute("title", languageNames[language]);
    await expect(button).toHaveAttribute(
      "aria-pressed",
      String(language === active),
    );
    await expect(button.locator("svg")).toHaveAttribute("aria-hidden", "true");
  }
  await expect(root.locator("select")).toHaveCount(0);
  await closePublicMenu(page);
}

async function loaded(page: Page) {
  await expect(page.locator(".property-card")).toHaveCount(2);
  await expect(page.locator("#listing-grid")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function lookup(page: Page, pubkey: string) {
  await page
    .locator('#npub-login [name="npub"]')
    .fill(nip19.npubEncode(pubkey));
  await page.locator("#npub-login button").click();
  await expect(page.locator(".client-account-name")).toHaveText("Profile");
  await expect(page.locator(".client-property-row")).toHaveCount(2);
  await expect(page.locator("#reload-dashboard")).toBeEnabled();
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

function noDelivery(mock: Awaited<ReturnType<typeof network>>, email?: string) {
  expect(mock.publications).toEqual([]);
  expect(
    mock.http.filter((request) => !["GET", "HEAD"].includes(request.method)),
  ).toEqual([]);
  expect(
    mock.messages.every((message) =>
      ["REQ", "CLOSE"].includes(JSON.parse(message)[0]),
    ),
  ).toBe(true);
  if (email) {
    expect(JSON.stringify(mock.http)).not.toContain(email);
    expect(mock.messages.join(" ")).not.toContain(email);
  }
}

async function noGhostBranding(page: Page) {
  await expect(page.locator("body")).not.toContainText(/ghost/i, {
    useInnerText: true,
  });
}

async function publicNavigation(page: Page, language: Language) {
  await openPublicMenu(page);
  const header = page.locator(".site-header");
  await expect(header.locator(".primary-nav a")).toHaveText([
    text(language, "Property search"),
    text(language, "How it works"),
    text(language, "My listings"),
    text(language, "Contact"),
  ]);
  await expect(
    header.locator(
      '.site-newsletter-link, a[href*="newsletter"], a[href*="#email"]',
    ),
  ).toHaveCount(0);
  await expect(
    header.getByRole("link", {
      name: text(language, "Email list"),
      exact: true,
    }),
  ).toHaveCount(0);
  await noGhostBranding(page);
}

for (const width of [390, 1280]) {
  for (const language of ["nl", "fr", "de"] as const) {
    test(`${width}px ${language} flags persist through How it works, My listings and Publish navigation`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const mock = await network(page);
      await page.goto("/?lang=en");
      await loaded(page);
      await selectLanguage(page, language);
      await controls(page);
      expect(
        await page.evaluate(() => localStorage.getItem("vastgoed-language")),
      ).toBe(language);
      await publicNavigation(page, language);
      await page
        .locator("#site-navigation")
        .getByRole("link", {
          name: text(language, "How it works"),
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/guides/" &&
          url.searchParams.get("lang") === language,
      );
      await expect(
        page.getByRole("heading", {
          name: text(language, "How Vastgoed works"),
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator("#search-form")).toHaveCount(0);
      await controls(page);
      await publicNavigation(page, language);
      await page
        .locator("#site-navigation")
        .getByRole("link", { name: text(language, "My listings"), exact: true })
        .click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/dashboard/" &&
          url.searchParams.get("lang") === language &&
          url.hash === "#listings",
      );
      await expect(page.locator("#npub-login")).toBeVisible();
      await controls(page, true);
      await noGhostBranding(page);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await revealLanguage(page);
      await page.locator(".client-browse").click();
      await loaded(page);
      await publicNavigation(page, language);
      await page
        .locator("#site-navigation")
        .getByRole("link", {
          name: text(language, "How it works"),
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: text(language, "How Vastgoed works"),
          exact: true,
        }),
      ).toBeVisible();
      await page.locator(".header-publish").click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/dashboard/" &&
          url.searchParams.get("lang") === language &&
          url.hash === "#editor",
      );
      await expect(page.locator("#listing-form")).toBeVisible();
      await expect(page.locator("#npub-login")).toBeHidden();
      await controls(page, true);
      await noGhostBranding(page);
      await noOverflow(page);
      noDelivery(mock);
    });
  }

  test(`${width}px flag buttons have native accessible names and support keyboard activation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mock = await network(page);
    await page.goto("/?lang=en");
    await loaded(page);
    await controls(page);
    for (const [language, key] of [
      ["nl", "Enter"],
      ["fr", "Space"],
      ["de", "Enter"],
      ["en", "Space"],
    ] as const) {
      await revealLanguage(page);
      const button = page.locator(
        `.site-header [data-language-button="${language}"]`,
      );
      await button.focus();
      await expect(button).toBeFocused();
      await page.keyboard.press(key);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await controls(page);
      await publicNavigation(page, language);
    }
    noDelivery(mock);
  });
}

for (const state of [
  "preview",
  "subscribe",
  "member",
  "invite-only",
  "disabled",
] as const) {
  test(`${state} email view uses membership branding in every language without sending account data`, async ({
    page,
  }) => {
    const mock =
      state === "preview"
        ? await network(page)
        : await network(page, true, state);
    await page.goto("/dashboard/?lang=en#email");
    const panel = page.locator('[data-client-view="email"]');
    await expect(panel).toBeVisible();
    for (const language of ["en", "nl", "fr", "de"] as const) {
      await selectLanguage(page, language);
      await expect(
        panel.getByRole("heading", {
          name: text(language, "Newsletter & membership"),
          exact: true,
        }),
      ).toBeVisible();
      await expect(panel).toContainText(
        text(language, "Your membership is separate from your Nostr identity."),
      );
      if (state === "member")
        await expect(
          panel.getByRole("link", {
            name: text(language, "Membership account"),
            exact: true,
          }),
        ).toHaveAttribute("href", "#/portal/account");
      if (state === "subscribe" || state === "invite-only")
        await expect(
          panel.getByRole("link", {
            name: text(language, "Sign in"),
            exact: true,
          }),
        ).toHaveAttribute("href", "#/portal/signin");
      if (state === "preview") {
        await panel
          .locator('input[type="email"]')
          .fill("brand-preview@example.com");
        await panel.locator('button[type="submit"]').click();
        await expect(panel.getByRole("status")).toHaveText(
          text(
            language,
            "No signup was sent. Open the live Vastgoed site to subscribe.",
          ),
        );
      }
      await noGhostBranding(page);
    }
    noDelivery(mock, "brand-preview@example.com");
  });
}

test.describe("browser language fallback", () => {
  test.use({ locale: "nl-BE" });
  test("Dutch browser locale translates navigation and the actual search heading", async ({
    page,
  }) => {
    const mock = await network(page);
    await page.goto("/");
    await loaded(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await openPublicMenu(page);
    await expect(
      page
        .locator(".primary-nav")
        .getByRole("link", { name: "Vastgoed zoeken", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Vind je volgende plek.",
        exact: true,
      }),
    ).toBeVisible();
    await controls(page);
    noDelivery(mock);
  });
});

test("query overrides storage and navigator; German persists through internal navigation and reload", async ({
  page,
}) => {
  const mock = await network(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", { get: () => ["de-DE"] });
    if (!sessionStorage.getItem("language-seeded")) {
      localStorage.setItem("vastgoed-language", "nl");
      sessionStorage.setItem("language-seeded", "1");
    }
  });
  await page.goto("/?lang=fr");
  await loaded(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".primary-nav a").first()).toHaveText(
    text("fr", "Property search"),
  );
  const query = page.locator('#search-form input[type="search"]');
  await query.fill("House");
  await selectLanguage(page, "de");
  await expect(query).toHaveValue("House");
  expect(
    await page.evaluate(() => localStorage.getItem("vastgoed-language")),
  ).toBe("de");
  await page.locator('.primary-nav a[href*="dashboard"]').click();
  await expect(page).toHaveURL(/lang=de/);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await controls(page, true);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.locator(".client-browse").click();
  await loaded(page);
  await expect(page).toHaveURL(/lang=de/);
  // With no query, the saved preference still wins over browser detection.
  await page.evaluate(() => history.replaceState(null, "", "/"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  noDelivery(mock);
});

test("stored Dutch preference overrides a German navigator without a query", async ({
  page,
}) => {
  const mock = await network(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "languages", { get: () => ["de-DE"] });
    localStorage.setItem("vastgoed-language", "nl");
  });
  await page.goto("/");
  await loaded(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await revealLanguage(page);
  await expect(
    page.locator('[data-language-button="nl"]:visible'),
  ).toHaveAttribute("aria-pressed", "true");
  noDelivery(mock);
});

test("public prices localize while signed author content stays literal and escaped", async ({
  page,
}) => {
  const mock = await network(page);
  await page.goto("/?lang=nl");
  await loaded(page);
  const prices: string[] = [];
  for (const language of ["nl", "fr", "en"] as const) {
    await selectLanguage(page, language);
    await expect(page.locator(".property-card h3")).toHaveText([
      unsafeTitle,
      "House",
    ]);
    const expected = new Intl.NumberFormat(
      { nl: "nl-NL", fr: "fr-BE", en: "en-GB" }[language],
      {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      },
    ).format(425000.5);
    await expect(page.locator(".property-card .price").first()).toHaveText(
      expected,
    );
    prices.push(expected);
    await page
      .locator(".property-card")
      .filter({
        has: page.getByRole("heading", { name: "House", exact: true }),
      })
      .locator("a.property-image")
      .click();
    await expect(page.locator(".listing-detail h1")).toHaveText("House");
    await expect(page.locator(".description-text")).toHaveText("Profile");
    await expect(page.locator(".publisher-name h2")).toHaveText("Profile");
    await expect(page.locator(".listing-price > p")).toHaveText(expected);
    await page.locator(".listing-back").click();
    await loaded(page);
  }
  expect(new Set(prices).size).toBe(3);
  expect(prices[0]).toMatch(/^€.*425\.000,50$/);
  expect(prices[1]).toMatch(/425.*000,50.*€$/);
  expect(prices[2]).toBe("€425,000.50");
  await page
    .locator(".property-card")
    .filter({ hasText: unsafeTitle })
    .locator("a.property-image")
    .click();
  await expect(page.locator(".listing-detail h1")).toHaveText(unsafeTitle);
  await expect(page.locator(".listing-detail h1 img")).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__languageXss")),
  ).toBeUndefined();
  await page.locator(".publisher-profile-link").click();
  await expect(page.locator(".profile-header h1")).toHaveText("Profile");
  noDelivery(mock);
});

test("read-only npub editor preserves English input and a local draft across languages and unsigned preview", async ({
  page,
}) => {
  const mock = await network(page);
  await page.goto("/dashboard/?lang=en");
  await lookup(page, mock.pubkey);
  expect(
    await page.evaluate(() => Reflect.get(window, "nostr")),
  ).toBeUndefined();
  await page
    .locator(".client-property-row")
    .filter({ hasText: "House" })
    .last()
    .locator("[data-edit]")
    .click();
  const form = page.locator("#listing-form");
  const values = {
    title: "House",
    location: "English location",
    description: "Profile",
    summary: "English summary",
  };
  for (const [name, value] of Object.entries(values))
    await form.locator(`[name="${name}"]`).fill(value);
  await page.locator("#save-draft").click();
  await expect(page.locator("#app-message")).toHaveText(
    "Draft saved on this browser only.",
  );
  for (const language of ["nl", "fr", "de"] as const) {
    await selectLanguage(page, language);
    for (const [name, value] of Object.entries(values))
      await expect(form.locator(`[name="${name}"]`)).toHaveValue(value);
    await form.locator('[name="title"]').fill("Temporary change");
    await page.locator("#restore-draft").click();
    await expect(page.locator("#app-message")).toHaveText(
      text(language, "Local draft restored. Review before publishing."),
    );
    for (const [name, value] of Object.entries(values))
      await expect(form.locator(`[name="${name}"]`)).toHaveValue(value);
  }
  await selectLanguage(page, "en");
  await selectLanguage(page, "nl");
  await page.locator("#preview-listing").click();
  const preview = page.locator("dialog.listing-preview-dialog");
  await expect(preview).toBeVisible();
  await expect(preview.locator(".listing-preview-notice")).toContainText(
    "Er is niets ondertekend of gepubliceerd.",
  );
  await expect(preview.locator("h1")).toHaveText("House");
  await expect(preview.locator(".description-text")).toHaveText("Profile");
  await expect(
    preview.locator(
      ".listing-provenance, #copy-link, #copy-npub, #property-map, time",
    ),
  ).toHaveCount(0);
  await preview.getByRole("link", { name: "Terug naar de editor" }).click();
  await expect(preview).toHaveCount(0);
  for (const [name, value] of Object.entries(values))
    await expect(form.locator(`[name="${name}"]`)).toHaveValue(value);
  await page.reload();
  await expect(page.locator("#reload-dashboard")).toBeEnabled();
  await page.locator('[data-client-nav="editor"]').click();
  await page.locator("#restore-draft").click();
  for (const [name, value] of Object.entries(values))
    await expect(form.locator(`[name="${name}"]`)).toHaveValue(value);
  noDelivery(mock);
});

test("anonymous dashboard email preview is independent of Nostr and sends no subscription", async ({
  page,
}) => {
  const mock = await network(page);
  await page.goto("/dashboard/?lang=nl#email");
  await expect(
    page.getByRole("heading", {
      name: text("nl", "Newsletter & membership"),
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await expect(page.locator('[data-client-view="email"]')).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "nostr")),
  ).toBeUndefined();
  const form = page.locator("[data-dashboard-preview-newsletter]");
  const email = "language-preview@example.com";
  await form.locator('input[type="email"]').fill(email);
  await selectLanguage(page, "fr");
  await expect(form.locator('input[type="email"]')).toHaveValue(email);
  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole("status")).toHaveText(
    text("fr", "No signup was sent. Open the live Vastgoed site to subscribe."),
  );
  noDelivery(mock, email);
});

test("hosted native membership node and submit listener survive lookup, refresh and language switches", async ({
  page,
}) => {
  const mock = await network(page, true);
  await page.goto("/dashboard/?lang=en#email");
  const membership = page.locator("#ghost-dashboard-membership");
  await expect(membership).toBeVisible();
  await expect(membership.locator("[data-members-email]")).toHaveCount(1);
  await expect(page.locator("[data-dashboard-preview-newsletter]")).toHaveCount(
    0,
  );
  const email = "native-form@example.com";
  await membership.locator("[data-members-email]").fill(email);
  await page.locator('[data-client-nav="listings"]').click();
  await lookup(page, mock.pubkey);
  await page.locator("#reload-dashboard").click();
  await expect(page.locator("#reload-dashboard")).toBeEnabled();
  await page.locator('[data-client-nav="email"]').click();
  for (const language of ["nl", "fr", "de"] as const)
    await selectLanguage(page, language);
  await expect(membership).toBeVisible();
  await expect(page.locator("#app [data-members-email]")).toHaveCount(1);
  await expect(membership.locator("[data-members-email]")).toHaveValue(email);
  expect(
    await page.evaluate(
      () =>
        document.getElementById("ghost-dashboard-membership") ===
          Reflect.get(window, "__membership") &&
        document.querySelector("#ghost-dashboard-membership form") ===
          Reflect.get(window, "__memberForm"),
    ),
  ).toBe(true);
  await membership.locator('button[type="submit"]').click();
  expect(await page.evaluate(() => Reflect.get(window, "__submits"))).toBe(1);
  noDelivery(mock, email);
});

for (const mobile of [false, true]) {
  test(`${mobile ? "390px mobile" : "desktop"} detail gallery, map and publisher remain usable in Dutch, French and German`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    );
    const mock = await network(page);
    await page.goto("/?lang=nl");
    await loaded(page);
    for (const language of ["nl", "fr", "de"] as const) {
      await selectLanguage(page, language);
      await controls(page);
      await noOverflow(page);
    }
    await page
      .locator(".property-card")
      .filter({
        has: page.getByRole("heading", { name: "House", exact: true }),
      })
      .locator("a.property-image")
      .click();
    for (const language of ["nl", "fr", "de"] as const) {
      await selectLanguage(page, language);
      await expect(page.locator("#property-map canvas")).toBeVisible();
      await expect(page.locator(".publisher-name h2")).toHaveText("Profile");
      await expect(page.locator("[data-publisher-avatar]")).toBeVisible();
      await expect(page.locator("[data-publisher-avatar]")).toHaveJSProperty(
        "naturalWidth",
        800,
      );
      await expect(page.locator(".listing-key-facts")).toHaveCount(0);
      for (const field of ["Bedrooms", "Bathrooms", "Floor area"]) {
        await expect(
          page
            .locator(".property-specifications dt")
            .filter({ hasText: text(language, field) }),
        ).toHaveCount(0);
      }
      await noOverflow(page);
      const opener = page.locator('[data-gallery-index="0"]');
      await opener.click();
      const dialog = page.locator("#property-gallery-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("[data-gallery-count]")).toHaveText(
        text(language, "Photo {current} of {total}")
          .replace("{current}", "1")
          .replace("{total}", "3"),
      );
      await dialog.locator("[data-gallery-next]").click();
      await expect(dialog.locator("[data-gallery-image]")).toHaveAttribute(
        "src",
        `${images}/0-1.svg`,
      );
      await dialog.locator("[data-gallery-previous]").click();
      await expect(dialog.locator("[data-gallery-image]")).toHaveAttribute(
        "src",
        `${images}/0-0.svg`,
      );
      await page.keyboard.press("ArrowLeft");
      await expect(dialog.locator("[data-gallery-image]")).toHaveAttribute(
        "src",
        `${images}/0-2.svg`,
      );
      await noOverflow(page);
      await page.screenshot({
        path: test
          .info()
          .outputPath(
            `gallery-${mobile ? "mobile" : "desktop"}-${language}.png`,
          ),
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
    }
    await page.screenshot({
      path: test
        .info()
        .outputPath(`detail-${mobile ? "mobile" : "desktop"}.png`),
      fullPage: true,
    });
    await page.locator(".listing-back").click();
    await loaded(page);
    await page
      .locator(".property-card")
      .filter({ hasText: unsafeTitle })
      .locator("a.property-image")
      .click();
    await expect(page.locator("#property-map")).toHaveCount(0);
    await expect(page.locator(".listing-location")).toContainText(
      text("de", "No exact map location supplied."),
    );
    await page.locator(".listing-back").click();
    await loaded(page);
    await openPublicMenu(page);
    await page.locator('.primary-nav a[href*="dashboard"]').click();
    await expect(page).toHaveURL(/\/dashboard\/(?:\?[^#]*)?#listings$/);
    if (mobile) await page.locator("#client-menu").click();
    for (const language of ["nl", "fr", "de"] as const) {
      await selectLanguage(page, language);
      // Switching language refreshes the dashboard view and closes mobile navigation.
      if (mobile) {
        await expect(page.locator("#client-menu")).toHaveAttribute(
          "aria-expanded",
          "false",
        );
        await page.locator("#client-menu").click();
        await expect(page.locator("#client-menu")).toHaveAttribute(
          "aria-expanded",
          "true",
        );
      }
      await controls(page, true);
      await noOverflow(page);
    }
    await page.screenshot({
      path: test
        .info()
        .outputPath(`sidebar-${mobile ? "mobile" : "desktop"}.png`),
      fullPage: true,
    });
    noDelivery(mock);
  });
}
