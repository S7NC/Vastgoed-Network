import { expect, test, type Page } from "@playwright/test";
import {
  finalizeEvent,
  matchFilter,
  verifyEvent,
  type Filter,
} from "nostr-tools";
import type { Map as LibreMap } from "maplibre-gl";

declare global {
  interface Window {
    __testMap: LibreMap;
  }
}

async function network(page: Page, instrumentMap = false) {
  const secret = new Uint8Array(32).fill(31);
  const points = [
    { title: "Utrecht projection fixture", longitude: 5.12, latitude: 52.09 },
    { title: "Delft projection fixture", longitude: 4.36, latitude: 52.01 },
    {
      title: "New York must not change Europe bounds",
      longitude: -74,
      latitude: 40.71,
    },
  ];
  const fixtures = points.map((point, index) =>
    finalizeEvent(
      {
        kind: 30402,
        created_at: 1700000000 + index,
        content: "Signed map fixture",
        tags: [
          ["d", `map-${index}`],
          ["t", "real-estate"],
          ["title", point.title],
          ["location", point.title],
          ["price", String(300000 + index), "EUR"],
          ["longitude", String(point.longitude)],
          ["latitude", String(point.latitude)],
        ],
      },
      secret,
    ),
  );
  fixtures.forEach((event) => expect(verifyEvent(event)).toBe(true));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5173") return route.continue();
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
  if (instrumentMap) {
    await page.route("**/src/map.ts*", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      expect(source).toContain("import * as maplibregl");
      // Only the intercepted test response exposes an instance. Real workers,
      // projection, controls, rendering and marker layout remain unmodified.
      const body = source
        .replace("import * as maplibregl", "import * as actualMaplibre")
        .replace(
          "maplibregl.setWorkerUrl",
          `const maplibregl = { ...actualMaplibre, Map: class extends actualMaplibre.Map {
          constructor(options) { super(options); window.__testMap = this; }
        }};\nmaplibregl.setWorkerUrl`,
        );
      await route.fulfill({ response, body });
    });
  }
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    socket.onMessage((raw) => {
      const [type, id, ...filters] = JSON.parse(String(raw));
      if (type !== "REQ") return;
      const sent = new Set<string>();
      for (const filter of filters as Filter[]) {
        for (const event of fixtures.filter((event) =>
          matchFilter(filter, event),
        )) {
          if (sent.has(event.id)) continue;
          sent.add(event.id);
          socket.send(JSON.stringify(["EVENT", id, event]));
        }
      }
      socket.send(JSON.stringify(["EOSE", id]));
    });
  });
  return points;
}

async function openMenu(page: Page) {
  const toggle = page.locator("#site-menu-toggle");
  if (await toggle.isVisible()) await toggle.click();
}

for (const width of [390, 768, 1100, 1280]) {
  test(`${width}px public navigation has real destinations and accessible menu dismissal`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await network(page);
    await page.goto("/");
    await expect(page.locator(".property-card")).toHaveCount(3);
    await expect(page.locator(".site-header [data-connect]")).toHaveCount(0);
    await expect(page.locator(".site-header [data-identity]")).toBeHidden();
    await expect(
      page.locator(
        '.site-header .site-newsletter-link, .site-header a[href*="newsletter"], .site-header a[href*="#email"]',
      ),
    ).toHaveCount(0);
    const toggle = page.locator("#site-menu-toggle");
    const panel = page.locator("#site-navigation");
    if (width <= 1100) {
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-controls", "site-navigation");
      await expect(panel).toBeHidden();
      await expect(panel.locator("[data-language-button]:visible")).toHaveCount(
        0,
      );
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toBeVisible();
      await expect(panel.locator("[data-language-button]:visible")).toHaveCount(
        4,
      );
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(toggle).toBeFocused();
      await toggle.click();
      await page.locator("#result-count").click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(panel).toBeHidden();
    } else {
      await expect(toggle).toBeHidden();
      await expect(panel).toBeVisible();
      await expect(panel.locator("[data-language-button]:visible")).toHaveCount(
        4,
      );
    }
    await openMenu(page);
    await panel
      .getByRole("link", { name: "How it works", exact: true })
      .click();
    await expect(page).toHaveURL(/\/guides\/$/);
    await expect(page.locator("#search-form")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "How Vastgoed works", exact: true }),
    ).toBeVisible();
    await openMenu(page);
    await page
      .locator("#site-navigation")
      .getByRole("link", { name: "My listings", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/#listings$/);
    await expect(page.locator("#npub-login")).toBeVisible();
    await expect(page.locator("#listing-form")).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}

async function projection(
  page: Page,
  points: { title: string; longitude: number; latitude: number }[],
) {
  await expect
    .poll(() =>
      page.evaluate((fixtures) => {
        const map = window.__testMap;
        const container = map.getContainer().getBoundingClientRect();
        return Math.max(
          ...fixtures.map((point) => {
            const pin = Array.from(
              document.querySelectorAll<HTMLElement>(".property-price-pin"),
            ).find(
              (pin) =>
                pin.getAttribute("aria-label")?.includes(point.title) ||
                pin.title.includes(point.title),
            );
            if (!pin || getComputedStyle(pin).position !== "absolute")
              return Infinity;
            const box = pin.getBoundingClientRect();
            const expected = map.project([point.longitude, point.latitude]);
            return Math.max(
              Math.abs(box.x + box.width / 2 - container.x - expected.x),
              Math.abs(box.bottom - container.y - expected.y),
            );
          }),
        );
      }, points),
    )
    .toBeLessThanOrEqual(1);
}

for (const width of [390, 1280]) {
  test(`${width}px real MapLibre starts over Europe with full-width map above cards and pins follow zoom, pan and resize`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const points = await network(page, true);
    await page.goto("/");
    await expect(page.locator(".property-price-pin")).toHaveCount(3);
    await expect(page.locator("#property-map canvas")).toBeVisible();
    await expect(page.locator(".search-layout")).toHaveAttribute(
      "data-view",
      "map",
    );
    await expect(page.locator(".results-panel")).toBeVisible();
    const mapBox = (await page.locator(".map-panel").boundingBox())!;
    const cardsBox = (await page.locator(".results-panel").boundingBox())!;
    expect(cardsBox.y).toBeGreaterThanOrEqual(mapBox.y + mapBox.height - 1);
    expect(Math.abs(cardsBox.width - mapBox.width)).toBeLessThanOrEqual(1);
    await expect
      .poll(() => page.evaluate(() => !!window.__testMap?.loaded()))
      .toBe(true);
    const initial = await page.evaluate(() => ({
      center: window.__testMap.getCenter().toArray(),
      bounds: window.__testMap.getBounds().toArray(),
    }));
    expect(initial.center[0]).toBeGreaterThan(0);
    expect(initial.center[0]).toBeLessThan(25);
    expect(initial.center[1]).toBeGreaterThan(45);
    expect(initial.center[1]).toBeLessThan(65);
    expect(initial.bounds[0][0]).toBeLessThanOrEqual(-25 + 0.01);
    expect(initial.bounds[1][0]).toBeGreaterThanOrEqual(45 - 0.01);
    expect(initial.bounds[0][1]).toBeLessThanOrEqual(34 + 0.01);
    expect(initial.bounds[1][1]).toBeGreaterThanOrEqual(71 - 0.01);
    expect(initial.bounds[0][0]).toBeGreaterThan(-74);
    for (const zoom of [3, 5, 8]) {
      await page.evaluate(
        (zoom) => window.__testMap.jumpTo({ center: [5, 52], zoom }),
        zoom,
      );
      await projection(page, points);
      await page.evaluate(() =>
        window.__testMap.panBy([65, -40], { duration: 0 }),
      );
      await projection(page, points);
    }
    await page.locator(".maplibregl-ctrl-zoom-in").click();
    await expect
      .poll(() => page.evaluate(() => window.__testMap.isMoving()))
      .toBe(false);
    await projection(page, points);
    for (const view of ["list", "split", "map"]) {
      await page.locator(`[data-search-view="${view}"]`).click();
      await expect(page.locator(".search-layout")).toHaveAttribute(
        "data-view",
        view,
      );
      if (view !== "list") await projection(page, points);
    }
    await page.setViewportSize({
      width: width === 390 ? 768 : 1100,
      height: 800,
    });
    await projection(page, points);
    await page.screenshot({
      path: test.info().outputPath(`map-projection-${width}.png`),
      fullPage: true,
    });
  });
}
