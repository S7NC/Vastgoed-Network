import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import Handlebars from "handlebars";
import {
  createThemeRenderer,
  integration,
  nativeMetadata,
  themeSource,
} from "../tests/helpers/render-theme";

const headOf = (html: string) => html.match(/<head>([\s\S]*?)<\/head>/)![1];
const tags = (head: string, name: string) =>
  [...head.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map(([tag]) => tag);
const meta = (head: string, key: string) =>
  tags(head, "meta").filter((tag) => tag.includes(`="${key}"`));
const content = (head: string, key: string) => {
  const matches = meta(head, key);
  expect(matches).toHaveLength(1);
  return matches[0].match(/content="([^"]*)"/)![1];
};
const image =
  "https://preview.example/network/assets/images/social-preview.png";
const alt =
  "Vastgoed.net | Property, without borders. Explore Europe. Publish your property for free.";

describe("server-rendered app metadata ownership", () => {
  it("places the public signup only on guides, after the FAQ and before articles", () => {
    const { render } = createThemeRenderer();
    const data = { site: { members_enabled: true } };
    const home = render("home", {}, data);
    const guides = render("index", {}, data);
    expect(home).not.toMatch(/id="newsletter"/);
    expect(guides.match(/id="newsletter"/g)).toHaveLength(1);
    const newsletter = guides.match(
      /<section\b[^>]*id="newsletter"[^>]*>[\s\S]*?<\/section>/,
    )![0];
    expect(newsletter.match(/data-members-form="subscribe"/g)).toHaveLength(1);
    expect(guides.indexOf('class="how-faq"')).toBeLessThan(
      guides.indexOf('id="newsletter"'),
    );
    expect(guides.indexOf('id="newsletter"')).toBeLessThan(
      guides.indexOf('class="guide-grid"'),
    );
  });

  it.each([
    ["home", "/", "Vastgoed.net | Find and publish property for free"],
    [
      "dashboard",
      "/dashboard/",
      "Publish and manage your property | Vastgoed.net",
    ],
    [
      "listing",
      "/listing/",
      "Property on the open real estate network | Vastgoed.net",
    ],
    ["profile", "/profile/", "Property publishers on Nostr | Vastgoed.net"],
    ["index", "/guides/", "How open real estate works | Vastgoed.net"],
  ])(
    "%s owns exactly one metadata set with request-aware URLs",
    (template, route, title) => {
      const canonical = `https://preview.example/network${route}`;
      const head = headOf(
        createThemeRenderer().render(template, { canonical }),
      );
      expect(head.match(/<title>/g)).toHaveLength(1);
      expect(head).toContain(`<title>${title}</title>`);
      expect(content(head, "description")).not.toBe("");
      expect(content(head, "og:title")).toBe(title);
      expect(content(head, "twitter:title")).toBe(title);
      expect(content(head, "og:description")).toBe(
        content(head, "description"),
      );
      expect(content(head, "twitter:description")).toBe(
        content(head, "description"),
      );
      expect(
        tags(head, "link").filter((tag) => tag.includes('rel="canonical"')),
      ).toEqual([`<link rel="canonical" href="${canonical}">`]);
      expect(content(head, "og:url")).toBe(canonical);
      expect(content(head, "twitter:url")).toBe(canonical);
      expect(content(head, "og:image")).toBe(image);
      expect(content(head, "twitter:image")).toBe(image);
      expect(content(head, "og:image:type")).toBe("image/png");
      expect(content(head, "og:image:width")).toBe("1200");
      expect(content(head, "og:image:height")).toBe("630");
      expect(content(head, "og:image:alt")).toBe(alt);
      expect(content(head, "twitter:image:alt")).toBe(alt);
      expect(content(head, "twitter:card")).toBe("summary_large_image");
      expect(content(head, "robots")).toBe(
        template === "dashboard"
          ? "noindex,nofollow"
          : "max-image-preview:large",
      );
      expect(head).toContain(integration);
      expect(head).not.toMatch(
        /Thoughts|stories and ideas|default[-_]?(?:stock|image)|@ghost|editorial\.example/i,
      );
      expect(head.match(/type="application\/ld\+json"/g) ?? []).toHaveLength(
        template === "home" ? 1 : 0,
      );
    },
  );

  it("home emits branded WebSite and publisher schema using the shared local assets", () => {
    const head = headOf(createThemeRenderer().render("home"));
    const schema = JSON.parse(
      head.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )![1],
    );
    expect(schema).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Vastgoed.net",
      url: "https://preview.example/network/",
      image,
      publisher: {
        "@type": "Organization",
        name: "Vastgoed.net",
        sameAs: ["https://vastgoed.org/"],
        logo: {
          "@type": "ImageObject",
          url: "https://preview.example/network/assets/images/apple-touch-icon.png",
          width: 180,
          height: 180,
        },
      },
    });
    expect(head).toContain(
      '<link rel="icon" type="image/svg+xml" href="/network/assets/images/favicon.svg">',
    );
    expect(head).toContain(
      '<link rel="apple-touch-icon" sizes="180x180" href="/network/assets/images/apple-touch-icon.png">',
    );
  });

  it.each(["home", "dashboard", "listing", "profile", "index"])(
    "%s preview is noindex without losing native integrations",
    (template) => {
      const head = headOf(
        createThemeRenderer().render(template, {
          context: [template, "preview"],
        }),
      );
      expect(content(head, "robots")).toBe("noindex,nofollow");
      expect(head).toContain(integration);
    },
  );

  it.each([
    ["post", "post"],
    ["page", "page"],
    ["index", "tag"],
    ["index", "author"],
  ])(
    "%s in %s context leaves native editorial metadata unchanged, even after home",
    (template, context) => {
      const renderer = createThemeRenderer();
      renderer.render("home");
      const head = headOf(renderer.render(template, { context: [context] }));
      expect(head.match(/<title>/g)).toHaveLength(1);
      expect(head).toContain("<title>Native editorial title</title>");
      expect(head).toContain(nativeMetadata);
      expect(head).toContain(integration);
      expect(content(head, "description")).toBe("Native editorial description");
      expect(content(head, "og:image")).toBe(
        "https://editorial.example/editorial.png",
      );
      expect(content(head, "twitter:image")).toBe(
        "https://editorial.example/editorial.png",
      );
      expect(head).not.toContain("social-preview.png");
      expect(head).not.toContain('"@type": "WebSite"');
    },
  );

  it("matches express-hbs append, missing block, fallback and repeated-read semantics", () => {
    const { hbs } = createThemeRenderer();
    const locals = { blockCache: {} as Record<string, string[]> };
    const html = hbs.compile(
      '{{#contentFor "x"}}<b>one</b>{{/contentFor}}{{#contentFor "x"}}two{{/contentFor}}{{#if (block "x")}}yes{{/if}}|{{block "x"}}|{{{block "x"}}}|{{{block "x"}}}|{{#block "missing"}}fallback{{/block}}',
    )(locals);
    expect(locals.blockCache.x).toEqual(["<b>one</b>", "two"]);
    expect(html).toBe(
      "yes|&lt;b&gt;one&lt;/b&gt;\ntwo|<b>one</b>\ntwo|<b>one</b>\ntwo|fallback",
    );
    expect(
      hbs.helpers.block.call(locals, "missing", {
        data: { root: locals },
        hash: {},
      } as Handlebars.HelperOptions),
    ).toBeUndefined();
    expect(
      hbs.helpers.block.call(locals, "x", {
        data: { root: locals },
        hash: {},
      } as Handlebars.HelperOptions),
    ).toBe("<b>one</b>\ntwo");
  });

  it("escapes custom title and description as attribute/text content, not markup", () => {
    const { hbs } = createThemeRenderer();
    const attack = '\" onload=\"alert(1)\"><script>alert(1)</script>&\' end';
    const html = hbs.compile(
      '{{> "app-metadata" pageTitle=title description=description}}',
    )({
      title: attack,
      description: attack,
      context: [],
      origin: "https://preview.example",
      requestBase: "",
      canonical: "https://preview.example/",
    });
    const escaped = Handlebars.escapeExpression(attack);
    expect(html).toContain(`<title>${escaped}</title>`);
    expect(content(html, "description")).toBe(escaped);
    expect(content(html, "og:title")).toBe(escaped);
    expect(content(html, "twitter:description")).toBe(escaped);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('" onload="');
  });
});

describe("shared brand assets", () => {
  it.each([
    ["social-preview.png", 1200, 630],
    ["apple-touch-icon.png", 180, 180],
  ])(
    "%s has a real PNG signature and the promised dimensions",
    (file, width, height) => {
      const png = readFileSync(
        new URL(`../assets/images/${file}`, import.meta.url),
      );
      expect([...png.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(png.toString("ascii", 12, 16)).toBe("IHDR");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
        width,
        height,
      ]);
    },
  );

  it("keeps the organization mark geometry local and masks it with currentColor", () => {
    const svg = themeSource("assets/images/vastgoed-mark.svg");
    expect(svg).toContain('viewBox="0 0 36 40"');
    expect(
      [...svg.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]),
    ).toEqual(["M3 34V15L18 4l15 11v19H22V21l-8 6v10H3", "m9 19 9-6.5 9 6.5"]);
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).not.toMatch(/(?:href|src)="https?:|<image|<script/);
    const css = themeSource("assets/css/brand.css");
    expect(css).toContain('url("../images/vastgoed-mark.svg")');
    expect(css).toContain("background-color: currentColor");
    expect(css).not.toMatch(/https?:\/\//);
    const { hbs, render } = createThemeRenderer();
    expect(hbs.compile('{{> "brand"}}')({})).toContain(
      '<span class="brand-symbol" aria-hidden="true"></span><span class="brand-name">vastgoed<span class="brand-suffix">.net</span></span>',
    );
    const html = render("home");
    expect(html.match(/aria-label="Vastgoed.net home"/g)).toHaveLength(2);
    expect(html).not.toMatch(/<a[^>]+href="https?:\/\/vastgoed\.org/);
  });
});
