import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { readFileSync } from "node:fs";
import type { Browser, Page } from "@playwright/test";
import type { ViteDevServer } from "vite";
import nl from "./locales/nl";
import fr from "./locales/fr";
import de from "./locales/de";
import {
  getLanguage,
  getLocale,
  initI18n,
  resolveLanguage,
  setLanguage,
  t,
  translate,
  type Language,
} from "./i18n";

afterEach(() => setLanguage("en"));

describe("language resolution", () => {
  it("uses query, storage, browser preferences, then English in that order", () => {
    expect(resolveLanguage("?page=listing&lang=de", "fr", ["nl-BE"])).toBe(
      "de",
    );
    expect(resolveLanguage("?lang=invalid", "fr", ["nl-BE"])).toBe("fr");
    expect(resolveLanguage("?lang=nl-BE", "invalid", ["es-ES", "nl-NL"])).toBe(
      "nl",
    );
    expect(resolveLanguage("", null, ["es-ES", "it-IT"])).toBe("en");
    expect(resolveLanguage()).toBe("en");
  });

  it.each([
    ["nl-BE", "nl"],
    ["nl-NL", "nl"],
    ["fr-BE", "fr"],
    ["de-BE", "de"],
    ["de-DE", "de"],
    ["EN-gb", "en"],
  ])("recognizes browser locale %s", (locale, expected) => {
    expect(resolveLanguage("", null, [locale])).toBe(expected);
  });

  it("honours explicit English and the first supported browser language", () => {
    expect(resolveLanguage("?lang=en", "nl", ["fr-BE"])).toBe("en");
    expect(resolveLanguage("", "en", ["fr-BE"])).toBe("en");
    expect(resolveLanguage("", null, ["es", "de-BE", "nl"])).toBe("de");
    expect(resolveLanguage("?language=fr", "FR", ["nld", "french"])).toBe("en");
  });
});

describe("catalogues", () => {
  it.each(["nl", "fr", "de"] as const)(
    "covers preview actions and existing form labels in %s",
    (code) => {
      setLanguage(code);
      const dictionary = { nl, fr, de }[code];
      for (const key of [
        "Public key copied.",
        "Listing preview",
        "Preview listing",
        "Close preview",
        "Back to editor",
        "Unpublished preview",
        "This preview is only visible in this browser. Nothing has been signed or published.",
        "Review the listing fields before opening the preview.",
        "Newsletter",
        "Newsletter & membership",
        "Membership account",
        "Email signup requires the live Vastgoed site. No subscription was created in this local preview.",
        "Menu",
        "How it works",
        "My listings",
        "Create your free listing",
        "Upload selected photos",
        "Country code",
        "Price period",
      ]) {
        expect(Object.hasOwn(dictionary, key), key).toBe(true);
        expect(t(key), key).not.toBe("");
        if (key !== "Newsletter" && key !== "Menu")
          expect(t(key), key).not.toBe(key);
      }
    },
  );
  it("covers literal UI keys in the listing, email and publishing identity views and membership template", () => {
    for (const path of [
      "./listing-view.ts",
      "./email-view.ts",
      "./publishing-identity.ts",
      "../partials/dashboard-membership.hbs",
    ]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      const keys = [
        ...source.matchAll(
          /(?:\b(?:text|t)\(\s*"|data-i18n="|\.i18n\s*=\s*")([^"]+)"/g,
        ),
      ].map((match) => match[1]);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        for (const dictionary of [nl, fr, de])
          expect(Object.hasOwn(dictionary, key), `${path}: ${key}`).toBe(true);
      }
    }
  });
  it("has exactly the same comprehensive source keys in all three dictionaries", () => {
    const keys = Object.keys(nl).sort();
    expect(keys.length).toBeGreaterThan(350);
    expect(Object.keys(fr).sort()).toEqual(keys);
    expect(Object.keys(de).sort()).toEqual(keys);
  });

  it.each([nl, fr, de])(
    "contains nonempty brand-neutral source keys and translations and preserves interpolation tokens",
    (dictionary) => {
      for (const [source, translation] of Object.entries(dictionary)) {
        expect(source).not.toMatch(/ghost/i);
        expect(translation, source).not.toMatch(/ghost/i);
        expect(translation.trim(), source).not.toBe("");
        const tokens = (value: string) =>
          (value.match(/\{\w+\}/g) ?? []).sort();
        expect(tokens(translation), source).toEqual(tokens(source));
      }
    },
  );

  it.each([
    ["nl", "Taal", "Vastgoed zoeken", "Mijn advertenties", "nl-NL"],
    ["fr", "Langue", "Recherche immobilière", "Mes annonces", "fr-BE"],
    ["de", "Sprache", "Immobiliensuche", "Meine Inserate", "de-DE"],
  ] as const)(
    "has clearly localized %s interface labels",
    (code, label, search, listings, locale) => {
      setLanguage(code);
      expect(getLanguage()).toBe(code);
      expect(getLocale()).toBe(locale);
      expect(t("Language")).toBe(label);
      expect(t("Property search")).toBe(search);
      expect(t("My Listings")).toBe(listings);
      expect(
        t("Minimum price must not be higher than maximum price."),
      ).not.toBe("Minimum price must not be higher than maximum price.");
      expect(
        t("Your membership is separate from your Nostr identity."),
      ).not.toBe("Your membership is separate from your Nostr identity.");
    },
  );
});

// Opt in to real DOM regressions without requiring a DOM emulator or browser install for node tests.
describe.runIf(process.env.I18N_BROWSER_TESTS === "1")(
  "browser localization",
  () => {
    let server: ViteDevServer;
    let browser: Browser;
    let page: Page;
    let origin: string;

    beforeAll(async () => {
      const { createServer } = await import("vite");
      const { chromium } = await import("@playwright/test");
      server = await createServer({
        configFile: false,
        server: { host: "127.0.0.1", port: 0 },
        optimizeDeps: { noDiscovery: true },
      });
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith("/i18n-test")) return next();
        response.setHeader("Content-Type", "text/html");
        response.end("<!doctype html><html><body></body></html>");
      });
      await server.listen();
      const address = server.httpServer!.address();
      if (!address || typeof address === "string")
        throw new Error("Missing test server port");
      origin = `http://127.0.0.1:${address.port}`;
      browser = await chromium.launch({ headless: true });
    }, 30000);

    beforeEach(async () => {
      page = await browser.newPage({ locale: "en-GB" });
      await page.goto(`${origin}/i18n-test?keep=1#editor`);
    });
    afterEach(async () => {
      await page?.close();
    });
    afterAll(async () => {
      await browser?.close();
      await server?.close();
    });

    it("mounts accessible flag buttons once and synchronizes new controls without changing forms", async () => {
      await page.setContent(
        '<form><input value="Keep my text"><div data-language-slot></div></form><a href="/dashboard/?tab=email#editor">Dashboard</a>',
      );
      await page.evaluate(async () => {
        const m = await new Function("return import('/src/i18n.ts')")();
        m.initI18n();
        const slot = document.querySelector("[data-language-slot]")!;
        m.mountLanguageSelector(slot);
        m.mountLanguageSelector(slot);
        document.querySelector("form")!.addEventListener("submit", (event) => {
          event.preventDefault();
          document.body.dataset.submitted = "true";
        });
      });
      expect(await page.locator("select").count()).toBe(0);
      expect(await page.locator("[data-language-button]").count()).toBe(4);
      const names = ["English", "Nederlands", "Français", "Deutsch"];
      for (const [index, code] of ["en", "nl", "fr", "de"].entries()) {
        const button = page.locator(`[data-language-button="${code}"]`);
        expect(await button.getAttribute("type")).toBe("button");
        expect(await button.getAttribute("aria-label")).toBe(names[index]);
        expect(await button.getAttribute("title")).toBe(names[index]);
        expect(
          await button.locator(".language-native-name").textContent(),
        ).toBe(names[index]);
        expect(
          await button
            .locator('svg[aria-hidden="true"][focusable="false"]')
            .count(),
        ).toBe(1);
      }
      const dutch = page
        .getByRole("button", { name: "Nederlands", exact: true })
        .first();
      await dutch.focus();
      await page.keyboard.press("Enter");
      expect(await dutch.getAttribute("aria-pressed")).toBe("true");
      expect(
        await page.getByRole("group", { name: "Taal", exact: true }).count(),
      ).toBe(1);
      expect(await page.locator("a").getAttribute("href")).toBe(
        "/dashboard/?tab=email&lang=nl#editor",
      );
      await page.evaluate(async () => {
        const slot = document.createElement("div");
        slot.setAttribute("data-language-slot", "");
        document.body.append(slot);
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      expect(
        await page
          .locator('[data-language-button="nl"][aria-pressed="true"]')
          .count(),
      ).toBe(2);
      await page
        .getByRole("button", { name: "Français", exact: true })
        .last()
        .focus();
      await page.keyboard.press("Space");
      expect(
        await page
          .locator('[data-language-button="fr"][aria-pressed="true"]')
          .count(),
      ).toBe(2);
      expect(
        await page
          .locator('[data-language-button][aria-pressed="false"]')
          .count(),
      ).toBe(6);
      expect(
        await page.getByRole("group", { name: "Langue", exact: true }).count(),
      ).toBe(2);
      expect(await page.locator("input").inputValue()).toBe("Keep my text");
      expect(
        await page.locator("body").getAttribute("data-submitted"),
      ).toBeNull();
      expect(
        await page
          .locator('[data-language-button="nl"]')
          .first()
          .getAttribute("aria-label"),
      ).toBe("Nederlands");
      expect(
        await page
          .locator('[data-language-button="en"]')
          .first()
          .getAttribute("title"),
      ).toBe("English");
      await page.addStyleTag({ url: `${origin}/assets/css/screen.css` });
      await page.addStyleTag({ url: `${origin}/assets/css/languages.css` });
      await page.setViewportSize({ width: 1440, height: 900 });
      const group = page.locator(".language-flags").first();
      expect((await group.boundingBox())!.width).toBe(128);
      expect(
        await dutch.locator("svg").evaluate((svg) => ({
          width: svg.getBoundingClientRect().width,
          height: svg.getBoundingClientRect().height,
        })),
      ).toEqual({ width: 24, height: 16 });
      await page.evaluate(() => {
        document.querySelector("form")!.className = "client-sidebar-footer";
      });
      expect((await group.boundingBox())!.width).toBeLessThanOrEqual(200);
      await page.setViewportSize({ width: 375, height: 812 });
      expect((await dutch.boundingBox())!.height).toBeGreaterThanOrEqual(40);
      expect((await group.boundingBox())!.width).toBeLessThanOrEqual(200);
    });

    it("uses explicit English leaf keys after t-rendering without destroying forms", async () => {
      const results = await page.evaluate(async () => {
        // Keep Vitest's server-side import transform out of the browser callback.
        const m = await new Function("return import('/src/i18n.ts')")();
        m.initI18n();
        m.setLanguage("fr");
        const leaf = document.createElement("p");
        leaf.dataset.i18n = "Membership account";
        leaf.textContent = m.t("Membership account");
        const form = document.createElement("form");
        form.dataset.i18n = "Newsletter";
        const label = document.createElement("label");
        label.dataset.i18n = "Email address";
        const input = document.createElement("input");
        input.value = "test@example.com";
        label.append(input);
        form.append(label, leaf);
        let submissions = 0;
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          submissions++;
        });
        document.body.append(form);
        m.translate(form);
        const labels: string[] = [];
        for (const code of ["de", "nl", "en", "fr"]) {
          m.setLanguage(code);
          labels.push(leaf.textContent!);
        }
        leaf.dataset.i18n = "Stay in the loop.";
        await new Promise((resolve) => setTimeout(resolve, 20));
        form.dispatchEvent(new Event("submit", { cancelable: true }));
        return {
          labels,
          updated: leaf.textContent,
          inputPreserved: label.firstChild === input && form.contains(input),
          value: input.value,
          submissions,
        };
      });
      expect(results).toEqual({
        labels: [
          "Mitgliedskonto",
          "Lidmaatschapsaccount",
          "Membership account",
          "Compte membre",
        ],
        updated: "Restez au courant.",
        inputPreserved: true,
        value: "test@example.com",
        submissions: 1,
      });
    });

    it("localizes only trusted complete facts, counters and relay report fragments", async () => {
      await page.setContent(
        `<ul class="property-facts"><li><svg></svg>1 bed</li><li>2 beds</li><li>1 bath</li><li>2.5 baths</li><li>1234.5 m²</li><li>2 beds in my house</li></ul><p id="dashboard-coverage">Relay.EXAMPLE:443: 4 listing events returned · [::1]:8080: searching · other.test: request failed · malformed: 2 events returned extra</p><p id="relay-reports">relay.test: 0 events returned. Empty responses can indicate no matches, access restrictions, or timeouts; they do not establish complete coverage.</p><p id="result-count">2 matching properties / 8 active properties loaded · Loading… · Map area applied</p><div data-user-content><p>relay.test: 2 events returned</p><ul class="property-facts"><li>2 beds</li></ul></div><p id="untrusted">2 beds</p>`,
      );
      const results = await page.evaluate(async () => {
        const m = await new Function("return import('/src/i18n.ts')")();
        m.initI18n();
        const original = document.body.textContent;
        m.setLanguage("fr");
        const facts = [
          ...document.querySelectorAll("body > .property-facts li"),
        ].map((node) => node.textContent);
        const reports = document.querySelector(
          "#dashboard-coverage",
        )!.textContent;
        const disclaimer =
          document.querySelector("#relay-reports")!.textContent;
        const count = document.querySelector("#result-count")!.textContent;
        const protectedText = document.querySelector(
          "[data-user-content]",
        )!.textContent;
        const untrusted = document.querySelector("#untrusted")!.textContent;
        m.setLanguage("de");
        m.setLanguage("nl");
        m.setLanguage("en");
        const restored = document.body.textContent === original;
        document.querySelector("#result-count")!.textContent =
          "1,000 matching properties / 8 active properties loaded";
        m.setLanguage("fr");
        return {
          facts,
          reports,
          disclaimer,
          count,
          protectedText,
          untrusted,
          restored,
          commaCount: document.querySelector("#result-count")!.textContent,
          svg: !!document.querySelector("li svg"),
        };
      });
      expect(results.facts).toEqual([
        "1 chambre",
        "2 chambres",
        "1 salle de bains",
        "2,5 salles de bains",
        `${new Intl.NumberFormat("fr-BE").format(1234.5)} m²`,
        "2 beds in my house",
      ]);
      expect(results.reports).toBe(
        "Relay.EXAMPLE:443: 4 événements d’annonce reçus · [::1]:8080: recherche en cours · other.test: échec de la requête · malformed: 2 events returned extra",
      );
      expect(results.disclaimer).toBe(
        `relay.test: 0 événements reçus. ${fr["Empty responses can indicate no matches, access restrictions, or timeouts; they do not establish complete coverage."]}`,
      );
      expect(results.count).toBe(
        "2 biens correspondants / 8 biens actifs chargés · Chargement… · Zone de la carte appliquée",
      );
      expect(results.protectedText).toBe("relay.test: 2 events returned2 beds");
      expect(results.untrusted).toBe("2 beds");
      expect(results.commaCount).toBe(
        "1,000 matching properties / 8 active properties loaded",
      );
      expect(results.restored && results.svg).toBe(true);
    });

    it("formats relay counts per locale while retaining the original host and English source", async () => {
      await page.setContent(
        '<p id="dashboard-coverage">Relay.EXAMPLE:443: 12345 listing events returned</p>',
      );
      const results = await page.evaluate(async () => {
        const m = await new Function("return import('/src/i18n.ts')")();
        m.initI18n();
        return ["nl", "fr", "de", "en", "fr"].map((code) => {
          m.setLanguage(code);
          return document.querySelector("#dashboard-coverage")!.textContent;
        });
      });
      expect(results).toEqual([
        `Relay.EXAMPLE:443: ${new Intl.NumberFormat("nl-NL").format(12345)} advertentie-events ontvangen`,
        `Relay.EXAMPLE:443: ${new Intl.NumberFormat("fr-BE").format(12345)} événements d’annonce reçus`,
        `Relay.EXAMPLE:443: ${new Intl.NumberFormat("de-DE").format(12345)} Inserats-Events empfangen`,
        "Relay.EXAMPLE:443: 12,345 listing events returned",
        `Relay.EXAMPLE:443: ${new Intl.NumberFormat("fr-BE").format(12345)} événements d’annonce reçus`,
      ]);
    });

    it("propagates locale only to safe internal UI routes, including observed links", async () => {
      await page.setContent(
        `<a id="route" href="/listing/?address=naddr1&amp;page=listing#photos">View</a><a id="relative" href="./dashboard/?tab=email#editor">Dashboard</a><a id="hash" href="#editor">Edit</a><a id="portal" href="#/portal/signup">Newsletter</a><a id="mail" href="mailto:test@example.com">Email</a><a id="external" href="https://example.com/path">Website</a><a id="nostr" href="nostr:npub1test">Nostr</a><a id="user" data-user-content href="/user-page?x=1">User</a><a id="publisher" class="publisher-website" href="/publisher-site">Visit website</a>`,
      );
      const results = await page.evaluate(async () => {
        const m = await new Function("return import('/src/i18n.ts')")();
        m.initI18n();
        const href = (id: string) =>
          document.getElementById(id)!.getAttribute("href");
        const initial = href("route");
        m.setLanguage("nl");
        const dutch = href("route");
        const relative = href("relative");
        const ignored = [
          "hash",
          "portal",
          "mail",
          "external",
          "nostr",
          "user",
          "publisher",
        ].map(href);
        const later = document.createElement("a");
        later.href = "/profile/?pubkey=npub1test#listings";
        document.body.append(later);
        await new Promise((resolve) => setTimeout(resolve, 20));
        const observed = later.getAttribute("href");
        m.setLanguage("en");
        return {
          initial,
          dutch,
          relative,
          ignored,
          observed,
          english: href("route"),
          url: location.search + location.hash,
        };
      });
      expect(results.initial).toBe(
        "/listing/?address=naddr1&page=listing#photos",
      );
      expect(results.dutch).toBe(
        "/listing/?address=naddr1&page=listing&lang=nl#photos",
      );
      expect(results.relative).toBe("/dashboard/?tab=email&lang=nl#editor");
      expect(results.ignored).toEqual([
        "#editor",
        "#/portal/signup",
        "mailto:test@example.com",
        "https://example.com/path",
        "nostr:npub1test",
        "/user-page?x=1",
        "/publisher-site",
      ]);
      expect(results.observed).toBe(
        "/profile/?pubkey=npub1test&lang=nl#listings",
      );
      expect(results.english).toBe(
        "/listing/?address=naddr1&page=listing&lang=en#photos",
      );
      expect(results.url).toBe("?keep=1&lang=en#editor");
    });

    it("handles storage denial, initial URL preferences and map-control attributes", async () => {
      await page.addInitScript(() =>
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Storage disabled", "SecurityError");
          },
        }),
      );
      await page.goto(`${origin}/i18n-test?lang=de`);
      await page.setContent(
        `<a href="/dashboard/?keep=1#email">Dashboard</a><button title="Zoom in" aria-label="Zoom in"></button>`,
      );
      const results = await page.evaluate(async () => {
        const m = await new Function("return import('/src/i18n.ts')")();
        m.initI18n();
        m.initI18n();
        const initial = {
          title: document.querySelector("button")!.title,
          href: document.querySelector("a")!.getAttribute("href"),
        };
        m.setLanguage("fr");
        const button = document.querySelector("button")!;
        button.title = "Zoom out";
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          initial,
          updated: button.title,
          aria: button.getAttribute("aria-label"),
          lang: document.documentElement.lang,
        };
      });
      expect(results).toEqual({
        initial: {
          title: "Vergrößern",
          href: "/dashboard/?keep=1&lang=de#email",
        },
        updated: "Dézoomer",
        aria: "Zoomer",
        lang: "fr",
      });
    });
  },
);

describe("translation API without a browser", () => {
  it("uses identity fallback without interpreting partial matches or inherited keys", () => {
    for (const code of ["en", "nl", "fr", "de"] as Language[]) {
      setLanguage(code);
      expect(t("My house is For sale in Location")).toBe(
        "My house is For sale in Location",
      );
      expect(t("toString")).toBe("toString");
      expect(t("__proto__")).toBe("__proto__");
      expect(t("Unknown source")).toBe("Unknown source");
    }
    setLanguage("en");
    expect(t("Property search")).toBe("Property search");
    expect(getLocale()).toBe("en-GB");
  });

  it("interpolates numbers, zero, empty strings and literal values without recursive replacement", () => {
    setLanguage("fr");
    expect(t("Photo {current} of {total}", { current: 0, total: 12 })).toBe(
      "Photo 0 sur 12",
    );
    expect(t("{count} listings loaded", { count: 3 })).toBe(
      "3 annonces chargées",
    );
    expect(t("Hello {name}!", { name: "" })).toBe("Hello !");
    expect(t("Hello {name}!", { name: "$& {other} <b>" })).toBe(
      "Hello $& {other} <b>!",
    );
    expect(t("Hello {name}!", { other: 1 })).toBe("Hello {name}!");
    expect(t("Photo {current} of {total}")).toBe("Photo {current} sur {total}");
    expect(t("{toString}")).toBe("{toString}");
  });

  it("switches repeatedly using English sources", () => {
    for (const code of ["nl", "fr", "de", "en", "fr", "nl"] as Language[]) {
      setLanguage(code);
      const dictionary = { en: { Language: "Language" }, nl, fr, de }[code];
      expect(t("Language")).toBe(dictionary.Language);
    }
  });

  it("guards DOM entry points and rejects unsupported runtime language values", () => {
    expect(() => {
      initI18n();
      initI18n();
      translate();
    }).not.toThrow();
    setLanguage("xx" as Language);
    expect(getLanguage()).toBe("en");
  });
});
