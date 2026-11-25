import { readFileSync, readdirSync } from "node:fs";
import Handlebars from "handlebars";

const root = new URL("../../", import.meta.url);
export const themeSource = (path: string) =>
  readFileSync(new URL(path, root), "utf8");

export const nativeMetadata = `
<meta name="description" content="Native editorial description">
<link rel="canonical" href="https://editorial.example/story/">
<meta property="og:title" content="Native editorial title">
<meta property="og:image" content="https://editorial.example/editorial.png">
<meta name="twitter:image" content="https://editorial.example/editorial.png">
<script type="application/ld+json">{"@type":"Article","name":"Native editorial title"}</script>`;
export const integration =
  '<script data-native-integration="preserved"></script>';

export function createThemeRenderer() {
  const hbs = Handlebars.create();
  for (const file of readdirSync(new URL("partials/", root))) {
    if (file.endsWith(".hbs")) {
      hbs.registerPartial(file.slice(0, -4), themeSource(`partials/${file}`));
    }
  }

  // Mirrors TryGhost/express-hbs main/lib/hbs.js: content(), express3() helpers.
  // In particular, block is a non-consuming string/undefined, NOT a SafeString.
  hbs.registerHelper("block", function (this: unknown, name, options) {
    let val = options.data.root.blockCache[name];
    if (val === undefined && typeof options.fn === "function") {
      val = options.fn(this);
    }
    if (Array.isArray(val)) {
      val = val.join("\n");
    }
    return val;
  });
  hbs.registerHelper("contentFor", function (this: unknown, name, options) {
    const block =
      options.data.root.blockCache[name] ||
      (options.data.root.blockCache[name] = []);
    block.push(options.fn(this));
  });

  // These are native-output fixtures, not an implementation of Ghost services.
  hbs.registerHelper("asset", (path, options) => {
    const relative = `${options.data.root.requestBase}/assets/${path}`;
    // Ghost's asset helper does not implement absolute=true in same-origin installs.
    return relative;
  });
  hbs.registerHelper("canonical_url", (options) => options.data.root.canonical);
  hbs.registerHelper("is", function (this: unknown, contexts: string, options) {
    return contexts
      .split(",")
      .some((name) => options.data.root.context.includes(name))
      ? options.fn(this)
      : options.inverse(this);
  });
  hbs.registerHelper(
    "ghost_head",
    (options) =>
      new hbs.SafeString(
        integration +
          (options.hash.exclude === "metadata,social_data,schema"
            ? ""
            : nativeMetadata),
      ),
  );
  hbs.registerHelper("ghost_foot", () => "");
  hbs.registerHelper("foreach", hbs.helpers.each);
  hbs.registerHelper("post", function (options) {
    return options.fn(options.data.root.post);
  });
  hbs.registerHelper(
    "match",
    function (this: unknown, left, operator, right, options) {
      const matches = operator === "!=" ? left !== right : left === right;
      return matches ? options.fn(this) : options.inverse(this);
    },
  );
  hbs.registerHelper("date", () => "2026");

  const layout = hbs.compile(themeSource("default.hbs"));
  function render(
    template: string,
    overrides: Record<string, unknown> = {},
    data: Record<string, unknown> = {},
  ) {
    const locals = {
      origin: "https://preview.example",
      requestBase: "/network",
      canonical: "https://preview.example/network/",
      context: [template],
      meta_title: "Native editorial title",
      post: { title: "Native editorial title", content: "Native article body" },
      ...overrides,
      blockCache: {},
    };
    const options = {
      data: {
        site: {
          url: "https://preview.example/network",
          title: "Thoughts, stories and ideas",
          locale: "en",
        },
        ...data,
      },
    };
    // express-hbs renders the entire child before passing its body to the layout.
    const body = hbs.compile(themeSource(`${template}.hbs`))(locals, options);
    return layout({ ...locals, body }, options);
  }
  return { hbs, render };
}
