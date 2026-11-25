import { expect, test, type Page } from "@playwright/test";
import {
  finalizeEvent,
  matchFilter,
  verifyEvent,
  type Filter,
} from "nostr-tools";
import nl from "../src/locales/nl";
import fr from "../src/locales/fr";
import de from "../src/locales/de";

async function network(page: Page, held = false) {
  const secret = new Uint8Array(32).fill(23);
  const fixtures = Array.from({ length: 53 }, (_, index) =>
    finalizeEvent(
      {
        kind: 30402,
        created_at: 1700000000 + index,
        content: "Signed pagination fixture",
        tags: [
          ["d", `pagination-${index}`],
          ["t", "real-estate"],
          ["title", `Pagination home ${index}`],
          ["location", "Delft"],
          ["country", index < 10 ? "BE" : "NL"],
          ["transaction", "sale"],
          ["property_type", "house"],
          ["price", String(200000 + index), "EUR"],
          ["latitude", "52.01"],
          ["longitude", "4.36"],
        ],
      },
      secret,
    ),
  );
  fixtures.forEach((event) => expect(verifyEvent(event)).toBe(true));
  const requests: Filter[] = [];
  const pending: (() => void)[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5173") return route.continue();
    if (url.href === "https://tiles.openfreemap.org/styles/positron")
      return route.fulfill({ json: { version: 8, sources: {}, layers: [] } });
    return route.abort();
  });
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    socket.onMessage((raw) => {
      const [type, subscription, ...filters] = JSON.parse(String(raw));
      if (type !== "REQ") return;
      requests.push(...filters);
      const respond = () => {
        const sent = new Set<string>();
        for (const filter of filters as Filter[]) {
          for (const event of [...fixtures]
            .reverse()
            .filter((event) => matchFilter(filter, event))
            .slice(0, filter.limit ?? 200)) {
            if (sent.has(event.id)) continue;
            sent.add(event.id);
            socket.send(JSON.stringify(["EVENT", subscription, event]));
          }
        }
        socket.send(JSON.stringify(["EOSE", subscription]));
      };
      if (held) pending.push(respond);
      else respond();
    });
  });
  return {
    requests,
    hold() {
      held = true;
    },
    release() {
      held = false;
      pending.splice(0).forEach((respond) => respond());
    },
  };
}

const titles = (start: number, count: number, oldest = false) =>
  Array.from(
    { length: count },
    (_, index) =>
      `Pagination home ${oldest ? start + index : 52 - start - index}`,
  );

async function loaded(page: Page) {
  await expect(page.locator("[data-loaded-count]")).toHaveText("53");
  await expect(page.locator("#listing-grid")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function pagination(page: Page, current: number, total = 53) {
  const pages = Math.ceil(total / 24);
  const count = Math.min(24, total - (current - 1) * 24);
  await expect(page.locator(".property-card")).toHaveCount(count);
  const nav = page.locator("#listing-pagination");
  await expect(nav).toBeVisible();
  await expect(nav).toHaveRole("navigation");
  await expect(nav.locator(".pagination-summary span")).toHaveText([
    `Showing ${(current - 1) * 24 + 1} to ${(current - 1) * 24 + count} of ${total} loaded matches`,
    `Page ${current} of ${pages}`,
  ]);
  await expect(nav.locator('[aria-current="page"]')).toHaveText(
    String(current),
  );
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
    "data-results-page",
    String(current),
  );
  await expect(nav.locator("button[aria-label]")).toHaveText(
    Array.from({ length: pages }, (_, index) => String(index + 1)),
  );
  const previous = nav.getByRole("button", {
    name: "Previous page",
    exact: true,
  });
  const following = nav.getByRole("button", { name: "Next page", exact: true });
  if (current === 1) await expect(previous).toBeDisabled();
  else await expect(previous).toBeEnabled();
  if (current === pages) await expect(following).toBeDisabled();
  else await expect(following).toBeEnabled();
  await expect(page.locator("#result-count")).toHaveText(
    `${total} matching properties / 53 active properties loaded`,
  );
}

async function next(page: Page) {
  await page
    .locator("#listing-pagination")
    .getByRole("button", { name: "Next page", exact: true })
    .click();
}

test("24/24/5 pages stay disjoint in Map, List and Split without relay queries", async ({
  page,
}) => {
  const mock = await network(page);
  await page.goto("/?kind=30402");
  await loaded(page);
  const requests = mock.requests.length;
  const discovery = mock.requests.filter((filter) =>
    filter["#t"]?.includes("real-estate"),
  );
  expect(discovery.length).toBeGreaterThan(0);
  expect(discovery.every((filter) => filter.limit === 150)).toBe(true);
  for (const view of ["map", "list", "split"]) {
    await page.locator(`[data-search-view="${view}"]`).click();
    await expect(page.locator(".search-layout")).toHaveAttribute(
      "data-view",
      view,
    );
    for (const current of [1, 2, 3]) {
      await pagination(page, current);
      await expect(page.locator(".property-card h3")).toHaveText(
        titles((current - 1) * 24, current === 3 ? 5 : 24),
      );
      await expect(page.locator("[data-mapped-count]")).toHaveText("53");
      await expect(page.locator(".property-price-pin")).toHaveCount(53);
      if (current < 3) await next(page);
    }
    await page
      .locator("#listing-pagination")
      .getByRole("button", { name: "Previous page", exact: true })
      .click();
    await pagination(page, 2);
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get("p") === "2" &&
        url.searchParams.get("kind") === "30402",
    );
    await page
      .locator('#listing-pagination button[aria-label][data-results-page="1"]')
      .click();
    await pagination(page, 1);
    await expect(page).toHaveURL(
      (url) =>
        !url.searchParams.has("p") && url.searchParams.get("kind") === "30402",
    );
  }
  expect(mock.requests.length).toBe(requests);
});

test("relay load-more keeps the card cap while loading and after completion", async ({
  page,
}) => {
  const mock = await network(page);
  await page.goto("/");
  await loaded(page);
  mock.hold();
  const requests = mock.requests.length;
  await page.locator("#load-more").click();
  await expect.poll(() => mock.requests.length).toBeGreaterThan(requests);
  await expect(page.locator("#listing-grid")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator(".property-card")).toHaveCount(24);
  mock.release();
  await loaded(page);
  await pagination(page, 1);
});

test("reload and Back/Forward restore page, filters and sort; apply and reset return to page one", async ({
  page,
}) => {
  const mock = await network(page);
  await page.goto("/?kind=30402&p=2");
  await loaded(page);
  await pagination(page, 2);
  await page.reload();
  await loaded(page);
  await pagination(page, 2);
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("p") === "2" &&
      url.searchParams.get("kind") === "30402",
  );
  const requests = mock.requests.length;
  await page.locator("#sort-order").selectOption("oldest");
  await pagination(page, 1);
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("sort") === "oldest" && !url.searchParams.has("p"),
  );
  await expect(page.locator(".property-card h3")).toHaveText(
    titles(0, 24, true),
  );
  await next(page);
  await pagination(page, 2);
  await page.locator("#toggle-filters").click();
  await page.locator('[name="country"]').fill("BE");
  await page.locator('#search-form button[type="submit"]').click();
  await pagination(page, 1, 10);
  await expect(page.locator(".property-card h3")).toHaveText(
    titles(0, 10, true),
  );
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("country") === "BE" && !url.searchParams.has("p"),
  );
  await page.locator("#reset-search").click();
  await pagination(page, 1);
  await expect(page.locator("#sort-order")).toHaveValue("newest");
  await page.goBack();
  await pagination(page, 1, 10);
  await expect(page.locator('[name="country"]')).toHaveValue("BE");
  await expect(page.locator("#sort-order")).toHaveValue("oldest");
  await page.goBack();
  await pagination(page, 2);
  await expect(page.locator('[name="country"]')).toHaveValue("");
  await expect(page.locator(".property-card h3")).toHaveText(
    titles(24, 24, true),
  );
  await page.goForward();
  await pagination(page, 1, 10);
  await page.goForward();
  await pagination(page, 1);
  expect(mock.requests.length).toBe(requests);
});

test("map-area actions reset pagination and popstate clears bounds", async ({
  page,
}) => {
  await network(page);
  await page.goto("/?p=2");
  await loaded(page);
  await expect(page.locator("#property-map canvas")).toBeVisible();
  await page.locator("#search-area").click();
  await expect(page).toHaveURL((url) => !url.searchParams.has("p"));
  await expect(page.locator("#clear-area")).toBeVisible();
  await expect(
    page.locator('#listing-pagination [aria-current="page"]'),
  ).toHaveText("1");
  await next(page);
  await page.locator("#clear-area").click();
  await pagination(page, 1);
  await expect(page).toHaveURL((url) => !url.searchParams.has("p"));
  await next(page);
  await page.locator("#search-area").click();
  await page.goBack();
  await pagination(page, 1);
  await expect(page.locator("#clear-area")).toBeHidden();
});

for (const [value, current] of [
  ["invalid", 1],
  ["-2", 1],
  ["0", 1],
  ["1.5", 1],
  ["02", 1],
  ["999999", 3],
  ["9007199254740992", 1],
] as const) {
  test(`direct p=${value} clamps without rewriting the URL or producing empty results`, async ({
    page,
  }) => {
    await network(page);
    await page.goto(`/?p=${value}`);
    await loaded(page);
    await pagination(page, current);
    await expect(page.locator(".property-card h3")).toHaveText(
      titles((current - 1) * 24, current === 3 ? 5 : 24),
    );
    await expect(page).toHaveURL((url) => url.searchParams.get("p") === value);
    await expect(page.locator("#listing-pagination")).not.toContainText("NaN");
  });
}

test("a delayed page-three deep link survives the initial empty render", async ({
  page,
}) => {
  const mock = await network(page, true);
  await page.goto("/?p=3");
  await expect(page.locator("[data-loaded-count]")).toHaveText("0");
  await expect(page.locator(".property-card")).toHaveCount(0);
  await expect(page.locator("#listing-pagination")).toBeHidden();
  await expect.poll(() => mock.requests.length).toBeGreaterThan(0);
  mock.release();
  await loaded(page);
  await pagination(page, 3);
  await expect(page.locator(".property-card h3")).toHaveText(titles(48, 5));
  await expect(page).toHaveURL(/p=3/);
});

for (const width of [1280, 390]) {
  test(`${width}px language flags localize page two without changing raw page or input values`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mock = await network(page);
    await page.goto("/?p=2&kind=30402&country=NL&sort=oldest");
    await loaded(page);
    const requests = mock.requests.length;
    const expectedTitles = titles(34, 19, true);
    for (const [language, catalog] of Object.entries({ nl, fr, de })) {
      if (!(await page.locator("[data-language-button]:visible").count()))
        await page.locator("#site-menu-toggle").click();
      await page
        .locator(`[data-language-button="${language}"]:visible`)
        .click();
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      if (await page.locator('#site-menu-toggle[aria-expanded="true"]').count())
        await page.keyboard.press("Escape");
      const text = (source: string) =>
        (catalog as Record<string, string>)[source] ?? source;
      const nav = page.locator("#listing-pagination");
      await expect(nav).toHaveAccessibleName(text("Listing pagination"));
      await expect(nav.locator(".pagination-summary span")).toHaveText([
        text("Showing {from} to {to} of {total} loaded matches")
          .replace("{from}", "25")
          .replace("{to}", "43")
          .replace("{total}", "43"),
        text("Page {current} of {total}")
          .replace("{current}", "2")
          .replace("{total}", "2"),
      ]);
      await expect(
        nav.getByRole("button", { name: text("Previous page"), exact: true }),
      ).toHaveAttribute("data-results-page", "1");
      await expect(
        nav.getByRole("button", { name: text("Next page"), exact: true }),
      ).toBeDisabled();
      await expect(nav.locator("button[aria-label]")).toHaveText(["1", "2"]);
      await expect(nav.locator('[aria-current="page"]')).toHaveAttribute(
        "data-results-page",
        "2",
      );
      await expect(page.locator(".property-card h3")).toHaveText(
        expectedTitles,
      );
      await expect(page.locator('[name="country"]')).toHaveValue("NL");
      await expect(page.locator("#sort-order")).toHaveValue("oldest");
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get("p") === "2" &&
          url.searchParams.get("lang") === language &&
          url.searchParams.get("kind") === "30402",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      const box = await nav.locator(".pagination-controls").boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    expect(mock.requests.length).toBe(requests);
  });
}
