import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`${width}px contact page provides the correct email in all interface languages`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === "http://127.0.0.1:5173"
        ? route.continue()
        : route.abort(),
    );
    await page.goto("/contact/");
    await expect(page.locator("#app h1")).toHaveText("Let's connect.");
    await expect(page.locator("#app form, #search-form")).toHaveCount(0);
    const email = page.locator(".contact-email");
    await expect(email).toHaveAttribute("href", "mailto:info@vastgoed.org");
    await expect(email).toContainText("info@vastgoed.org");
    await expect(page.locator(".publish-section")).toBeHidden();
    const headings = {
      nl: "Laten we kennismaken.",
      fr: "Prenons contact.",
      de: "Kommen wir ins Gespräch.",
    };
    for (const [language, heading] of Object.entries(headings)) {
      const menu = page.locator("#site-menu-toggle");
      if (
        (await menu.isVisible()) &&
        (await menu.getAttribute("aria-expanded")) !== "true"
      )
        await menu.click();
      await page
        .locator(`.site-header [data-language-button="${language}"]`)
        .click();
      await expect(page.locator("#app h1")).toHaveText(heading);
      await expect(email).toHaveAttribute("href", "mailto:info@vastgoed.org");
      await expect(
        page.locator('.primary-nav a[href*="contact"]'),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page.locator('.primary-nav a[href*="contact"]'),
      ).toHaveAttribute("href", `/contact/?lang=${language}`);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
    }
    await page.reload();
    await expect(page.locator("#app h1")).toHaveText(headings.de);
    await expect(
      page.locator('.site-footer a[href*="contact"]'),
    ).toHaveAttribute("href", "/contact/?lang=de");
  });
}
