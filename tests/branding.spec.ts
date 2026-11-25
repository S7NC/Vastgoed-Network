import { expect, test, type Locator, type Page } from "@playwright/test";

async function offline(page: Page) {
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url());
  });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5173") return route.continue();
    if (url.href === "https://tiles.openfreemap.org/styles/positron") {
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
    }
    return route.abort();
  });
  await page.routeWebSocket(/^wss?:\/\//, (socket) => {
    socket.onMessage((raw) => {
      const [type, id] = JSON.parse(String(raw));
      if (type === "REQ") socket.send(JSON.stringify(["EOSE", id]));
    });
  });
  return imageRequests;
}

async function brand(link: Locator, visible = true) {
  if (visible) await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /^\/(?:\?page=search)?$/);
  await expect(link.locator(":scope > span.brand-symbol")).toHaveCount(1);
  await expect(link.locator(":scope > span.brand-name")).toHaveText(
    "vastgoed.net",
  );
  await expect(link.locator(".brand-symbol")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(link).not.toContainText(".org");
  if (visible) {
    const mask = await link
      .locator(".brand-symbol")
      .evaluate((element) => getComputedStyle(element).maskImage);
    // Vite may inline this local asset rather than issue a separate SVG request.
    if (mask.startsWith('url("data:image/svg+xml,')) {
      const svg = decodeURIComponent(mask);
      expect(svg).toContain("M3 34V15L18 4l15 11v19H22V21l-8 6v10H3");
      expect(svg).toContain("m9 19 9-6.5 9 6.5");
    } else {
      expect(mask).toBe(
        'url("http://127.0.0.1:5173/assets/images/vastgoed-mark.svg")',
      );
    }
  }
}

for (const width of [390, 1280]) {
  test(`${width}px public and client brands use the local mark without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const imageRequests = await offline(page);
    await page.goto("/");
    await brand(page.locator(".site-header .wordmark"));
    const footer = page.locator(".site-footer .wordmark");
    await brand(footer);
    const colors = await footer.locator(".brand-symbol").evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color };
    });
    expect(colors.background).toBe(colors.color);
    const channels = colors.color.match(/\d+/g)!.slice(0, 3).map(Number);
    expect(Math.min(...channels)).toBeGreaterThan(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const headerBox = await page
      .locator(".site-header .wordmark")
      .boundingBox();
    expect(headerBox!.x).toBeGreaterThanOrEqual(0);
    expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(width);

    await page.goto("/dashboard/#editor");
    await expect(page.locator("#listing-form")).toBeVisible();
    await brand(page.locator(".client-mobile-bar .wordmark"), width === 390);
    await brand(page.locator(".client-sidebar .wordmark"), width === 1280);
    if (width === 390) {
      await page.locator("#client-menu").click();
      await brand(page.locator(".client-sidebar .wordmark"));
      await page.locator("#client-close").click();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      imageRequests.filter(
        (url) => new URL(url).origin !== "http://127.0.0.1:5173",
      ),
    ).toEqual([]);
    await expect(page.locator('a.wordmark[href*="vastgoed.org"]')).toHaveCount(
      0,
    );
  });
}

test.describe("static preview without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("ships the brand and social metadata in the actual HTTP head before app startup", async ({
    page,
  }) => {
    await offline(page);
    const response = await page.goto("/");
    const head = (await response!.text()).split("</head>")[0];
    expect(head.match(/<title>/g)).toHaveLength(1);
    expect(head).toContain(
      "<title>Vastgoed.net | Find and publish property for free</title>",
    );
    expect(head.match(/name="description"/g)).toHaveLength(1);
    expect(head).not.toMatch(/Thoughts|@ghost|default[-_]image/i);
    await brand(page.locator(".site-header .wordmark"));
    await brand(page.locator(".site-footer .wordmark"));
    for (const key of ["og:image", "twitter:image"]) {
      const selector = key.startsWith("og:")
        ? `meta[property="${key}"]`
        : `meta[name="${key}"]`;
      await expect(page.locator(selector)).toHaveCount(1);
      await expect(page.locator(selector)).toHaveAttribute(
        "content",
        "https://vastgoed.net/assets/images/social-preview.png",
      );
    }
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/assets/images/favicon.svg",
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/assets/images/apple-touch-icon.png",
    );
    await expect(page.locator("#app")).toContainText("Loading property search");
  });
});
