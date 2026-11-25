import nl from "./locales/nl";
import fr from "./locales/fr";
import de from "./locales/de";

export type Language = "en" | "nl" | "fr" | "de";
const dictionaries: Record<Language, Readonly<Record<string, string>>> = {
  en: {},
  nl,
  fr,
  de,
};
const locales = { en: "en-GB", nl: "nl-NL", fr: "fr-BE", de: "de-DE" };
const names = {
  en: "English",
  nl: "Nederlands",
  fr: "Français",
  de: "Deutsch",
};
const languages = Object.keys(names) as Language[];
const valid = (value: string | null): value is Language =>
  value !== null && languages.includes(value as Language);
let language: Language = "en";
let initialized = false;
const texts = new WeakMap<Text, { source: string; last: string }>();
const selectors = new WeakSet<Element>();
const attributes = new WeakMap<
  Element,
  Map<string, { source: string; last: string }>
>();
const whitelist = ["aria-label", "title", "placeholder"];
const coverageDisclaimer =
  "Empty responses can indicate no matches, access restrictions, or timeouts; they do not establish complete coverage.";
const protectedSelector = [
  "script",
  "style",
  "noscript",
  "textarea",
  "code",
  "pre",
  "img",
  "[data-user-content]",
  "[contenteditable]:not([contenteditable='false'])",
  ".description-text",
  ".identity-key",
  ".client-account-name",
  ".property-city",
  ".property-card h3",
  ".client-property-info strong",
  ".client-property-info p",
  ".listing-detail h1",
  ".listing-summary",
  ".profile-header h1",
  ".gh-content",
  ".article-header",
  ".guide-grid",
  ".property-price-pin",
  ".price",
  ".maplibregl-popup-content",
  ".listing-detail .results-header > div > p",
  ".language-native-name",
].join(",");

/** Explicit preferences require exact supported codes; browser locales may be regional. */
export function resolveLanguage(
  search = "",
  stored: string | null = null,
  preferred: readonly string[] = [],
): Language {
  const query = new URLSearchParams(search).get("lang");
  if (valid(query)) return query;
  if (valid(stored)) return stored;
  for (const locale of preferred) {
    const base = locale.toLowerCase().split("-")[0];
    if (valid(base)) return base;
  }
  return "en";
}

export function getLanguage(): Language {
  return language;
}
export function getLocale(): string {
  return locales[language];
}

export function t(
  source: string,
  values: Record<string, string | number> = {},
): string {
  const dictionary = dictionaries[language];
  const translated = Object.hasOwn(dictionary, source)
    ? dictionary[source]
    : source;
  return translated.replace(/\{(\w+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}

function uiText(source: string, parent: Element): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(source)!;
  const core = match[2];
  let result = t(core);
  // Only complete counter strings in their known app-owned containers are interpreted.
  if (parent.matches("#result-count")) {
    const count =
      /^(\d+) matching properties \/ (\d+) active properties loaded( · Loading…)?( · Map area applied)?$/.exec(
        core,
      );
    if (count)
      result =
        t("{count} matching properties / {total} active properties loaded", {
          count: count[1],
          total: count[2],
        }) +
        (count[3] ? ` · ${t("Loading…")}` : "") +
        (count[4] ? ` · ${t("Map area applied")}` : "");
  } else if (parent.matches(".client-status, #client-filter-count")) {
    const count = /^(\d+) listings? (loaded|in this view)$/.exec(core);
    if (count)
      result = t(
        `{count} ${count[1] === "1" ? "listing" : "listings"} ${count[2]}`,
        { count: count[1] },
      );
  } else if (parent.matches(".property-facts li")) {
    const fact = /^(\d+(?:\.\d+)?) (bed|beds|bath|baths|m²)$/.exec(core);
    if (fact)
      result = `${new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 20 }).format(Number(fact[1]))} ${t(fact[2])}`;
  } else if (parent.matches("#dashboard-coverage, #relay-reports")) {
    const suffix = `. ${coverageDisclaimer}`;
    const hasDisclaimer = core.endsWith(suffix);
    const reports = hasDisclaimer ? core.slice(0, -suffix.length) : core;
    result =
      reports
        .split(" · ")
        .map((fragment) => {
          // Preserve the host exactly, including case, ports and IPv6 brackets.
          const report =
            /^([^\s/]+): (?:(\d+) (listing events returned|events returned)|(searching|request failed))$/.exec(
              fragment,
            );
          if (!report) return fragment;
          const status = report[2]
            ? t(`{count} ${report[3]}`, {
                count: new Intl.NumberFormat(getLocale()).format(
                  BigInt(report[2]),
                ),
              })
            : t(report[4]);
          return `${report[1]}: ${status}`;
        })
        .join(" · ") + (hasDisclaimer ? `. ${t(coverageDisclaimer)}` : "");
    if (result === core) result = t(core);
  }
  return match[1] + result + match[3];
}

function syncLink(element: Element): void {
  if (
    typeof window === "undefined" ||
    !element.matches("a[href]") ||
    element.matches(".publisher-website, [download], [target='_blank']")
  )
    return;
  if (
    language === "en" &&
    !new URLSearchParams(window.location.search).has("lang")
  )
    return;
  const href = element.getAttribute("href")!;
  if (!href.trim() || href.trimStart().startsWith("#")) return;
  try {
    const url = new URL(href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      !/^https?:$/.test(url.protocol) ||
      url.hash.startsWith("#/portal") ||
      url.username ||
      url.password
    )
      return;
    url.searchParams.set("lang", language);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (href !== next) element.setAttribute("href", next);
  } catch {
    /* Ignore invalid or non-navigation URLs. */
  }
}

export function translate(root?: Node): void {
  if (typeof document === "undefined") return;
  const start = root ?? document;
  const visit = (node: Node) => {
    const element =
      node.nodeType === 1 ? (node as Element) : node.parentElement;
    if (!element || element.closest(protectedSelector)) return;
    if (node.nodeType === 3) {
      const text = node as Text;
      const previous = texts.get(text);
      const key =
        element.childElementCount === 0
          ? element.getAttribute("data-i18n")
          : null;
      const source =
        key !== null
          ? key
          : previous && previous.last === text.data
            ? previous.source
            : text.data;
      const last = uiText(source, element);
      texts.set(text, { source, last });
      if (text.data !== last) text.data = last;
    } else if (node.nodeType === 1) {
      const key = element.getAttribute("data-i18n");
      // Explicit keys own only leaves, never a label's input or a form's children.
      if (
        key !== null &&
        element.childElementCount === 0 &&
        element.textContent !== t(key)
      )
        element.textContent = t(key);
      syncLink(element);
      let saved = attributes.get(element);
      if (!saved) attributes.set(element, (saved = new Map()));
      for (const name of whitelist) {
        if (
          element.matches("[data-language-button]") &&
          (name === "aria-label" || name === "title")
        )
          continue;
        const value = element.getAttribute(name);
        if (value === null) {
          saved.delete(name);
          continue;
        }
        const previous = saved.get(name);
        const source =
          previous && previous.last === value ? previous.source : value;
        // Property image labels contain publisher titles, not general UI phrases.
        const view =
          name === "aria-label" && element.matches("a.property-image")
            ? /^View (.+)$/.exec(source)
            : null;
        const last = view ? `${t("View")} ${view[1]}` : t(source);
        saved.set(name, { source, last });
        if (value !== last) element.setAttribute(name, last);
      }
      if (element.matches("button[data-language-button]")) {
        const code = element.getAttribute("data-language-button");
        if (!valid(code)) return;
        const pressed = String(code === language);
        if (element.getAttribute("aria-pressed") !== pressed)
          element.setAttribute("aria-pressed", pressed);
        if (!selectors.has(element)) {
          selectors.add(element);
          element.addEventListener("click", () => {
            setLanguage(code);
          });
        }
      }
    }
  };
  visit(start);
  const walker = document.createTreeWalker(start, 1 | 4, {
    acceptNode(node) {
      const element =
        node.nodeType === 1 ? (node as Element) : node.parentElement;
      return element?.closest(protectedSelector) ? 2 : 1;
    },
  });
  while (walker.nextNode()) visit(walker.currentNode);
}

export function mountLanguageSelector(target: Element): void {
  if (typeof document === "undefined" || target.closest(protectedSelector))
    return;
  if (target.querySelector("[data-language-button]")) {
    translate(target);
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "language-control language-flags";
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", "Language");
  // Fixed local flag artwork is a visual shortcut; native names identify languages.
  const flags: Record<Language, string> = {
    en: '<path fill="#012169" d="M0 0h24v16H0z"/><path stroke="#fff" stroke-width="4" d="m0 0 24 16M24 0 0 16"/><path stroke="#c8102e" stroke-width="1.5" d="m0 0 24 16M24 0 0 16"/><path stroke="#fff" stroke-width="6" d="M12 0v16M0 8h24"/><path stroke="#c8102e" stroke-width="3" d="M12 0v16M0 8h24"/>',
    nl: '<path fill="#ae1c28" d="M0 0h24v6H0z"/><path fill="#fff" d="M0 5.333h24v5.334H0z"/><path fill="#21468b" d="M0 10.667h24V16H0z"/>',
    fr: '<path fill="#002395" d="M0 0h8v16H0z"/><path fill="#fff" d="M8 0h8v16H8z"/><path fill="#ed2939" d="M16 0h8v16h-8z"/>',
    de: '<path fill="#000" d="M0 0h24v6H0z"/><path fill="#d00" d="M0 5.333h24v5.334H0z"/><path fill="#ffce00" d="M0 10.667h24V16H0z"/>',
  };
  for (const code of languages) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-flag-button";
    button.setAttribute("data-language-button", code);
    button.setAttribute("title", names[code]);
    button.setAttribute("aria-label", names[code]);
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" focusable="false">${flags[code]}</svg>`;
    const name = document.createElement("span");
    name.className = "language-native-name";
    name.textContent = names[code];
    button.append(name);
    wrapper.append(button);
  }
  target.append(wrapper);
  translate(wrapper);
}

function mountSlots(root: Node): void {
  if (root.nodeType === 1 && (root as Element).matches("[data-language-slot]"))
    mountLanguageSelector(root as Element);
  if ("querySelectorAll" in root)
    (root as ParentNode)
      .querySelectorAll("[data-language-slot]")
      .forEach(mountLanguageSelector);
}

export function setLanguage(next: Language): void {
  if (!valid(next)) return;
  const changed = language !== next;
  language = next;
  if (typeof window === "undefined" || typeof document === "undefined") return;
  document.documentElement.lang = language;
  try {
    window.localStorage.setItem("vastgoed-language", language);
  } catch {
    /* Optional storage. */
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", language);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* Sandboxed previews may disallow history changes. */
  }
  translate();
  if (changed)
    window.dispatchEvent(
      new CustomEvent("vastgoed:languagechange", {
        detail: { language, locale: getLocale() },
      }),
    );
}

export function initI18n(): void {
  if (
    initialized ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  )
    return;
  initialized = true;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem("vastgoed-language");
  } catch {
    /* Optional storage. */
  }
  language = resolveLanguage(
    window.location.search,
    stored,
    window.navigator.languages,
  );
  document.documentElement.lang = language;
  mountSlots(document);
  translate();
  const observer = new MutationObserver((records) => {
    const roots = new Set<Node>();
    for (const record of records) {
      if (record.type === "childList")
        record.addedNodes.forEach((node) => roots.add(node));
      else roots.add(record.target);
    }
    for (const root of roots) {
      if (!root.isConnected) continue;
      mountSlots(root);
      translate(root);
    }
  });
  // Equality checks make our own mutations no-ops on the next observer delivery.
  observer.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...whitelist, "data-i18n", "href"],
  });
}
