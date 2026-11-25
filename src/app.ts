import {
  nip19,
  verifyEvent,
  type Event,
  type EventTemplate,
} from "nostr-tools";
import type * as MapLibre from "maplibre-gl";
import "../assets/css/client.css";
import {
  buildListingTags,
  filterListings,
  formatPrice as rawFormatPrice,
  latestListings,
  parseListing,
  safeUrl,
  type Listing,
  type ListingInput,
  type ListingFilters,
} from "./model";
import {
  DEFAULT_BLOSSOM,
  DEFAULT_RELAYS,
  discover,
  publish,
  query,
  relayUrls,
  sign,
  uploadImage,
} from "./network";
import { clearCache, readLocal, writeLocal } from "./storage";
import {
  getLanguage,
  getLocale,
  initI18n,
  mountLanguageSelector,
  setLanguage,
  t,
  translate,
} from "./i18n";
import { renderListingDetail, bindListingGallery } from "./listing-view";
import { createEmailView } from "./email-view";
import { createPublishingIdentity } from "./publishing-identity";
import { initNavigation } from "./navigation";
import { renderGuides } from "./guides";
import { renderContact } from "./contact";
import { brandMarkup } from "./brand";

const app = document.querySelector<HTMLElement>("#app");
const params = new URLSearchParams(location.search);
const RESULTS_PER_PAGE = 24;
let resultsPage = readResultsPage(params);
const preview = import.meta.env.DEV;
const pathPage = location.pathname.split("/")[1];
const page = preview
  ? (params.get("page") ??
    (["dashboard", "listing", "profile", "guides", "contact"].includes(pathPage)
      ? pathPage
      : "search"))
  : app?.dataset.page;
if (page === "dashboard") document.body.classList.add("dashboard-client");
let pubkey = "";
let relays = DEFAULT_RELAYS;
let blossom = DEFAULT_BLOSSOM;
let events: Event[] = [];
let pending: Event | null = null;
let editing: Event | null = null;
let profileEvent: Event | undefined;
let relayEvent: Event | undefined;
let until = Math.floor(Date.now() / 1000);
let maplibregl: typeof MapLibre | undefined;
let map: MapLibre.Map | undefined;
const markers = new Map<string, MapLibre.Marker>();
let bounds: MapLibre.LngLatBounds | undefined;
let searchBusy = false;
let publishing = false;
let identityGeneration = 0;
let profileReady = false;
let reports: string[] = [];
let dashboardLoading = false;
let dashboardReports: string[] = [];
let dashboardLoad = 0;
let accountWriteRelays: string[] = [];
let composerIdentityAdopted = false;
let uploadingPhotos = false;
const queuedPhotos: {
  id: string;
  file: File;
  url: string;
  uploaded?: string;
}[] = [];
let detailContext:
  { listing: Listing; publisher: Record<string, unknown> } | undefined;
let previewDialog: HTMLDialogElement | undefined;
let previewListing: Listing | undefined;
const priceListings = new Map<string, Listing>();
const formatPrice = (listing: Listing) => {
  if (listing.price === null) return t("On request");
  const amount = rawFormatPrice({ ...listing, frequency: "" }, getLocale());
  return listing.frequency ? `${amount} / ${t(listing.frequency)}` : amount;
};
const priceMarkup = (listing: Listing) => {
  priceListings.set(listing.address, listing);
  return `<span data-price-address="${escape(listing.address)}">${escape(formatPrice(listing))}</span>`;
};

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const now = () => Math.floor(Date.now() / 1000);
const npub = (key: string) => nip19.npubEncode(key);
const route = (name: string, values: Record<string, string> = {}) => {
  const query = new URLSearchParams(values);
  if (
    getLanguage() !== "en" ||
    new URLSearchParams(location.search).has("lang")
  )
    query.set("lang", getLanguage());
  if (preview) {
    query.set("page", name);
    return `/?${query}`;
  }
  return `/${name === "search" ? "" : `${name}/`}${query.size ? `?${query}` : ""}`;
};
const addressLink = (listing: Listing) =>
  route("listing", {
    address: nip19.naddrEncode({
      kind: 30402,
      pubkey: listing.pubkey,
      identifier: listing.identifier,
      relays: (listing.pubkey === pubkey ? accountWriteRelays : relays).slice(
        0,
        4,
      ),
    }),
  });
const message = (text: string, error = false) => {
  let node = document.querySelector<HTMLElement>("#app-message");
  if (!node) {
    node = document.createElement("p");
    node.id = "app-message";
    node.setAttribute("role", "status");
    (app?.querySelector(".client-main") ?? app)?.prepend(node);
  }
  node.className = `notice ${error ? "error" : "success"}`;
  node.textContent = text;
};
const run = (action: () => Promise<void>) => {
  void action().catch((error) =>
    message(
      error instanceof Error ? error.message : "Something went wrong.",
      true,
    ),
  );
};
const field = (
  name: string,
  label: string,
  value = "",
  type = "text",
  extra = "",
) =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`;
const select = (name: string, label: string, choices: string[][], value = "") =>
  `<label class="field">${label}<select name="${name}">${choices.map(([key, text]) => `<option value="${key}" ${key === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
const types = [
  ["", "All property types"],
  ["apartment", "Apartment"],
  ["house", "House"],
  ["land", "Land"],
  ["commercial", "Commercial"],
  ["other", "Other"],
];
const publishingIdentity = createPublishingIdentity({
  getPubkey: () => pubkey,
  isEditing: () => !!editing,
  adopt: adoptPublishingIdentity,
  notify: message,
  changed: updateComposerControls,
});

function merge(incoming: Event[]) {
  if (!Array.isArray(incoming)) return;
  const unique = new Map(events.map((event) => [event.id, event]));
  for (const event of incoming) {
    try {
      if (verifyEvent(event) && event.created_at <= now() + 60)
        unique.set(event.id, event);
    } catch {
      /* Untrusted relay data. */
    }
  }
  const values = [...unique.values()];
  // Deletion requests must outlive ordinary cache eviction to suppress old copies.
  events = [
    ...values.filter((event) => event.kind !== 5).slice(-5000),
    ...values.filter((event) => event.kind === 5),
  ];
}

function deleted(event: Event) {
  const address = `${event.kind}:${event.pubkey}:${event.tags.find((t) => t[0] === "d")?.[1] ?? ""}`;
  return events.some(
    (deletion) =>
      deletion.kind === 5 &&
      deletion.pubkey === event.pubkey &&
      deletion.tags.some(
        (tag) =>
          (tag[0] === "e" && tag[1] === event.id) ||
          (tag[0] === "a" &&
            tag[1] === address &&
            deletion.created_at >= event.created_at),
      ),
  );
}

function listings() {
  const removed = new Set(events.filter(deleted).map((event) => event.id));
  return latestListings(events).filter((listing) => !removed.has(listing.id));
}

async function loadDeletions(authors: string[], sources = relays) {
  if (!authors.length) return;
  merge(
    await query(sources, {
      kinds: [5],
      authors: [...new Set(authors)].slice(0, 100),
      limit: 500,
    }),
  );
}

function card(listing: Listing) {
  const fact = (path: string, text: string) =>
    `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${path}"/></svg>${escape(text)}</li>`;
  return `<article class="property-card" data-listing-address="${escape(listing.address)}">
    <a href="${addressLink(listing)}" class="property-image" aria-label="View ${escape(listing.title)}">
      ${listing.images[0] ? `<img src="${escape(listing.images[0])}" alt="${escape(listing.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span class="image-placeholder"><span class="placeholder-line"></span>No photograph supplied</span>'}
      <span class="badge">${escape(listing.transaction === "rent" ? "For rent" : listing.transaction === "sale" ? "For sale" : "Property")}</span>
      <span class="card-open" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18L18 6 M6 6h12v12"/></svg></span>
    </a>
    <div class="property-body">
      <p class="property-city">${escape(listing.location || "Location not supplied")}</p>
      <p class="price">${priceMarkup(listing)}</p>
      <h3><a href="${addressLink(listing)}">${escape(listing.title)}</a></h3>
      <ul class="property-facts">${listing.bedrooms !== null ? fact("M3 18v3 M21 18v3 M3 18h18V9H3z M3 13h18 M7 9V6h10v3", `${listing.bedrooms} ${listing.bedrooms === 1 ? "bed" : "beds"}`) : ""}${listing.bathrooms !== null ? fact("M3 12h18 M5 12V5a2 2 0 0 1 4 0 M4 12l1 7h14l1-7 M7 19v2 M17 19v2", `${listing.bathrooms} ${listing.bathrooms === 1 ? "bath" : "baths"}`) : ""}${listing.area !== null ? fact("M4 4h16v16H4z M8 16l8-8 M8 8h8v8", `${listing.area} m²`) : ""}</ul>
      <p class="property-footnote"><span>${escape(listing.propertyType || "Real estate")}</span><span>Published on Nostr</span></p>
    </div>
  </article>`;
}

function initSearch() {
  if (!app) return;
  const get = (key: string) => params.get(key) ?? "";
  const icon = (path: string) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${path}"/></svg>`;
  const moreFilters = [
    "country",
    "currency",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "frequency",
  ].some((key) => get(key));
  app.innerHTML = `
    <div class="search-heading">
      <div class="search-title"><p class="eyebrow">Property, without borders</p><h1>Find your next place.</h1></div>
      <div class="search-network-stat"><span class="network-live" aria-hidden="true"></span><strong data-loaded-count>0</strong><span>active listings loaded</span></div>
    </div>
    <form id="search-form" class="search-form">
      <div class="property-searchbar">
        <div class="search-primary">
          ${field("query", "City, region or keywords", get("query"), "search", 'placeholder="Where would you like to live?"')}
          ${select(
            "transaction",
            "Looking to",
            [
              ["", "Buy or rent"],
              ["sale", "Buy"],
              ["rent", "Rent"],
            ],
            get("transaction"),
          )}
          ${select("propertyType", "Property type", types, get("propertyType"))}
          <button class="button" type="submit">${icon("M21 21l-5-5 M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15")}Apply filters</button>
        </div>
        <div class="search-secondary">
          <button type="button" id="toggle-filters" aria-expanded="${moreFilters}" aria-controls="advanced-filters">${icon("M4 7h16 M4 17h16 M8 4v6 M16 14v6")}More filters <span data-filter-count hidden>0</span></button>
          <button type="button" id="reset-search">Reset</button>
          <p class="search-hint">An open property network. No login to explore.</p>
        </div>
        <div class="advanced-filters" id="advanced-filters" ${moreFilters ? "" : "hidden"}>
          ${field("country", "Country code", get("country"), "text", 'placeholder="NL, BE, US" maxlength="2"')}
          ${field("currency", "Currency", get("currency"), "text", 'placeholder="EUR, USD" maxlength="3"')}
          ${field("minPrice", "Minimum price", get("minPrice"), "number", 'min="0" step="any"')}
          ${field("maxPrice", "Maximum price", get("maxPrice"), "number", 'min="0" step="any"')}
          ${field("bedrooms", "Minimum bedrooms", get("bedrooms"), "number", 'min="0"')}
          ${select(
            "frequency",
            "Price period",
            [
              ["", "Any period"],
              ["once", "One-time price"],
              ["month", "Per month"],
              ["week", "Per week"],
              ["year", "Per year"],
              ["day", "Per day"],
            ],
            get("frequency"),
          )}
        </div>
      </div>
      <p class="search-validation" id="search-validation" role="status" hidden></p>
    </form>
    <div class="search-overview">
      <div class="search-result-heading"><h2><span data-match-count>0</span> properties to explore</h2><p id="result-count" role="status" aria-live="polite"></p></div>
      <div class="search-tools">
        <div class="sort-field"><label for="sort-order">Sort</label><select id="sort-order"><option value="newest">Newest first</option><option value="oldest" ${get("sort") === "oldest" ? "selected" : ""}>Oldest first</option></select></div>
        <div class="view-switch" role="group" aria-label="Search layout">
          <button type="button" id="view-list" data-search-view="list" aria-pressed="false">${icon("M3 6h18 M3 12h18 M3 18h18")}List</button>
          <button type="button" id="view-split" data-search-view="split" aria-pressed="false">${icon("M3 4h18v16H3z M12 4v16")}Split</button>
          <button type="button" id="view-map" data-search-view="map" aria-pressed="true">${icon("M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z M9 3v16 M15 5v16")}Map</button>
        </div>
      </div>
    </div>
    <div class="search-layout" data-view="map">
      <section class="results-panel" aria-label="Property results" tabindex="-1"><div id="listing-grid" class="listing-grid" aria-busy="true"></div><nav id="listing-pagination" class="listing-pagination" aria-label="Listing pagination" hidden></nav></section>
      <aside class="map-panel" aria-label="Property map">
        <div class="map-toolbar"><button id="search-area" class="button-secondary button-small">Search this map area</button><button id="clear-area" class="button-secondary button-small" hidden>Clear area</button></div>
        <div id="property-map"></div>
        <div class="map-caption"><span class="map-status"><span data-mapped-count>0</span> properties on the map</span><span>Map shows loaded matches, not just this page.</span><span>Locations may be approximate</span></div>
        <p id="map-feedback" class="map-feedback" role="status" hidden></p>
      </aside>
    </div>
    <div class="search-load-actions"><button id="load-more" class="button">Load more from relays</button><button id="refresh" class="button-secondary">Refresh latest</button></div>
    <p class="search-disclaimer">Showing listings retrieved from connected relays, not a complete market index. A signature does not verify property ownership. Verify properties and publishers independently.</p>
    <details class="coverage-details"><summary>Network coverage &amp; relay settings</summary><form id="discovery-settings" class="coverage-form">${field("relays", "Discovery relays (maximum 8)", relays.join(", "))}<button class="button button-small">Save and reload</button></form><p id="relay-reports" class="muted"></p></details>`;
  document
    .querySelector("#search-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget as HTMLFormElement);
      const next = new URLSearchParams(location.search);
      for (const [key, value] of data) {
        if (String(value).trim()) next.set(key, String(value));
        else next.delete(key);
      }
      resultsPage = 1;
      next.delete("p");
      history.pushState(null, "", `${location.pathname}?${next}`);
      renderResults();
    });
  document.querySelector("#reset-search")?.addEventListener("click", () => {
    (document.querySelector("#search-form") as HTMLFormElement).reset();
    document
      .querySelectorAll<HTMLInputElement>("#search-form input")
      .forEach((input) => (input.value = ""));
    document
      .querySelectorAll<HTMLSelectElement>("#search-form select")
      .forEach((input) => (input.value = ""));
    bounds = undefined;
    resultsPage = 1;
    document.querySelector<HTMLSelectElement>("#sort-order")!.value = "newest";
    history.pushState(null, "", route("search"));
    renderResults();
  });
  document
    .querySelector("#toggle-filters")
    ?.addEventListener("click", (event) => {
      const filters = document.querySelector<HTMLElement>("#advanced-filters")!;
      filters.hidden = !filters.hidden;
      (event.currentTarget as HTMLElement).setAttribute(
        "aria-expanded",
        String(!filters.hidden),
      );
    });
  const setSearchView = (view: string) => {
    document.querySelector<HTMLElement>(".search-layout")!.dataset.view = view;
    document
      .querySelectorAll<HTMLElement>("[data-search-view]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.searchView === view),
        ),
      );
    requestAnimationFrame(() => map?.resize());
  };
  setSearchView("map");
  document
    .querySelectorAll<HTMLElement>("[data-search-view]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        setSearchView(button.dataset.searchView!),
      ),
    );
  document.querySelector("#sort-order")?.addEventListener("change", () => {
    resultsPage = 1;
    const url = new URL(location.href);
    url.searchParams.delete("p");
    if (
      document.querySelector<HTMLSelectElement>("#sort-order")!.value ===
      "oldest"
    )
      url.searchParams.set("sort", "oldest");
    else url.searchParams.delete("sort");
    history.pushState(null, "", url);
    renderResults();
  });
  document
    .querySelector("#load-more")
    ?.addEventListener("click", () => run(loadSearch));
  document.querySelector("#refresh")?.addEventListener("click", () => {
    until = now();
    run(loadSearch);
  });
  document.querySelector("#search-area")?.addEventListener("click", () => {
    bounds = map?.getBounds();
    resultsPage = 1;
    const url = new URL(location.href);
    url.searchParams.delete("p");
    history.replaceState(null, "", url);
    renderResults();
  });
  document.querySelector("#clear-area")?.addEventListener("click", () => {
    bounds = undefined;
    resultsPage = 1;
    const url = new URL(location.href);
    url.searchParams.delete("p");
    history.replaceState(null, "", url);
    renderResults();
  });
  document
    .querySelector("#discovery-settings")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      run(async () => {
        if (searchBusy)
          throw new Error(
            "Wait for the current relay discovery to finish before changing sources.",
          );
        relays = relayUrls(
          String(
            new FormData(event.currentTarget as HTMLFormElement).get("relays"),
          ),
        );
        await writeLocal("discovery-relays", relays);
        until = now();
        events = [];
        resultsPage = 1;
        const url = new URL(location.href);
        url.searchParams.delete("p");
        history.replaceState(null, "", url);
        await loadSearch();
      });
    });
  run(async () => {
    await createMap();
    renderResults();
  });
  renderResults();
  run(loadSearch);
}

async function createMap() {
  try {
    ({ maplibregl } = await import("./map"));
    map = new maplibregl.Map({
      container: "property-map",
      style: "https://tiles.openfreemap.org/styles/positron",
      bounds: [
        [-25, 34],
        [45, 71],
      ],
      fitBoundsOptions: { padding: 24, maxZoom: 3.5 },
      renderWorldCopies: false,
      minZoom: 1,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    const currentMap = map;
    currentMap.on("style.load", () =>
      currentMap.setProjection({ type: "mercator" }),
    );
    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const container = currentMap.getContainer();
        if (container.clientWidth && container.clientHeight)
          currentMap.resize();
      });
    });
    resizeObserver.observe(currentMap.getContainer());
    currentMap.once("remove", () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeFrame);
    });
    let warned = false;
    map.on("error", () => {
      if (!warned) {
        warned = true;
        const feedback = document.querySelector<HTMLElement>("#map-feedback");
        if (feedback) {
          feedback.hidden = false;
          feedback.textContent =
            "Map tiles could not be loaded. Property results are still available.";
        } else
          message(
            "Map tiles could not be loaded. Property details are still available.",
            true,
          );
      }
    });
  } catch {
    message("The map needs WebGL. Listing search is still available.", true);
  }
}

function readResultsPage(query: URLSearchParams) {
  const value = query.get("p") ?? "1";
  const number = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(number) ? number : 1;
}

function renderResults() {
  const form = document.querySelector<HTMLFormElement>("#search-form");
  if (!form) return;
  const filters = Object.fromEntries(new FormData(form)) as ListingFilters;
  const all = listings();
  const filtered = filterListings(all, filters).filter(
    (listing) =>
      !bounds ||
      (listing.latitude !== null &&
        listing.longitude !== null &&
        bounds.contains([listing.longitude, listing.latitude])),
  );
  if (
    document.querySelector<HTMLSelectElement>("#sort-order")?.value === "oldest"
  )
    filtered.reverse();
  const pageCount = Math.max(1, Math.ceil(filtered.length / RESULTS_PER_PAGE));
  const currentPage = Math.min(resultsPage, pageCount);
  const pageStart = (currentPage - 1) * RESULTS_PER_PAGE;
  const pageListings = filtered.slice(pageStart, pageStart + RESULTS_PER_PAGE);
  const advancedCount = [
    "country",
    "currency",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "frequency",
  ].filter((key) => String(new FormData(form).get(key) ?? "").trim()).length;
  const countBadge = document.querySelector<HTMLElement>(
    "[data-filter-count]",
  )!;
  countBadge.textContent = String(advancedCount);
  countBadge.hidden = !advancedCount;
  document.querySelector("[data-loaded-count]")!.textContent =
    all.length.toLocaleString(getLocale());
  document.querySelector("[data-match-count]")!.textContent =
    filtered.length.toLocaleString(getLocale());
  document
    .querySelector("#listing-grid")!
    .setAttribute("aria-busy", String(searchBusy));
  const validation = document.querySelector<HTMLElement>("#search-validation")!;
  const needsCurrency =
    !!(filters.minPrice || filters.maxPrice) && !filters.currency?.trim();
  const needsPeriod =
    !!(filters.minPrice || filters.maxPrice) &&
    !filters.frequency &&
    filters.transaction !== "sale";
  const invalidRange =
    !!filters.minPrice &&
    !!filters.maxPrice &&
    Number(filters.minPrice) > Number(filters.maxPrice);
  validation.hidden = !needsCurrency && !invalidRange && !needsPeriod;
  validation.textContent = needsCurrency
    ? "Choose a currency in More filters before applying a price range. Different currencies cannot be compared directly."
    : invalidRange
      ? "Minimum price must not be higher than maximum price."
      : needsPeriod
        ? "Choose a price period in More filters, or select Buy for one-time prices. Weekly and monthly rents cannot be compared directly."
        : "";
  document.querySelector("#listing-grid")!.innerHTML = filtered.length
    ? pageListings.map(card).join("")
    : `<div class="empty-state"><div class="empty-illustration" aria-hidden="true"></div><p class="eyebrow">An open door to something new</p><h3>${searchBusy ? "Exploring the property network..." : "Your next place is out there."}</h3><p>${searchBusy ? "Searching connected relays for property listings. Results will appear as they arrive." : "No matching properties loaded yet. Try a broader search or load more from the network."}</p><a class="button" href="${route("dashboard")}#editor">Have a place to share? Publish for free</a><p class="empty-caption">Your property. Your identity. No listing fee from Vastgoed.</p><a class="text-link" href="/guides/#newsletter">Get a fresh perspective. Join the email list</a></div>`;
  const pagination = document.querySelector<HTMLElement>(
    "#listing-pagination",
  )!;
  pagination.hidden = !filtered.length;
  const number = (value: number) => value.toLocaleString(getLocale());
  const pages = [
    ...new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]),
  ]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b);
  let previous = 0;
  const pageButtons = pages
    .map((value) => {
      const gap =
        previous && value - previous > 1
          ? '<span aria-hidden="true">…</span>'
          : "";
      previous = value;
      return `${gap}<button type="button" data-results-page="${value}" aria-label="${escape(t("Go to page {page}", { page: number(value) }))}" ${value === currentPage ? 'aria-current="page"' : ""}>${number(value)}</button>`;
    })
    .join("");
  pagination.innerHTML = `<div class="pagination-summary" role="status" aria-live="polite"><span>${escape(t("Showing {from} to {to} of {total} loaded matches", { from: number(filtered.length ? pageStart + 1 : 0), to: number(pageStart + pageListings.length), total: number(filtered.length) }))}</span><span>${escape(t("Page {current} of {total}", { current: number(currentPage), total: number(pageCount) }))}</span></div><div class="pagination-controls"><button type="button" data-results-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>${escape(t("Previous page"))}</button>${pageButtons}<button type="button" data-results-page="${currentPage + 1}" ${currentPage === pageCount ? "disabled" : ""}>${escape(t("Next page"))}</button></div>`;
  pagination
    .querySelectorAll<HTMLButtonElement>("[data-results-page]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const next = Number(button.dataset.resultsPage);
        if (
          !Number.isSafeInteger(next) ||
          next < 1 ||
          next > pageCount ||
          next === currentPage
        )
          return;
        resultsPage = next;
        const url = new URL(location.href);
        if (next === 1) url.searchParams.delete("p");
        else url.searchParams.set("p", String(next));
        history.pushState(null, "", url);
        renderResults();
        const panel = document.querySelector<HTMLElement>(".results-panel")!;
        panel.focus({ preventScroll: true });
        panel.scrollIntoView({ block: "start" });
      }),
    );
  document.querySelector("#result-count")!.textContent =
    `${filtered.length} matching properties / ${all.length} active properties loaded${searchBusy ? " · Loading…" : ""}${bounds ? " · Map area applied" : ""}`;
  document.querySelector<HTMLButtonElement>("#clear-area")!.hidden = !bounds;
  const mappable = filtered
    .filter(
      (listing) => listing.latitude !== null && listing.longitude !== null,
    )
    .slice(0, 300);
  document.querySelector("[data-mapped-count]")!.textContent = String(
    mappable.length,
  );
  const mappedAddresses = new Set(mappable.map((listing) => listing.address));
  for (const [address, marker] of markers) {
    if (!mappedAddresses.has(address)) {
      marker.remove();
      markers.delete(address);
    }
  }
  if (map && maplibregl) {
    for (const listing of mappable) {
      if (listing.latitude === null || listing.longitude === null) continue;
      const link = document.createElement("a");
      link.href = addressLink(listing);
      link.textContent = `${listing.title} · ${formatPrice(listing)}`;
      const existing = markers.get(listing.address);
      const pin = existing?.getElement() ?? document.createElement("button");
      pin.setAttribute("type", "button");
      pin.classList.add("property-price-pin");
      pin.textContent = formatPrice(listing);
      pin.setAttribute(
        "aria-label",
        `${listing.title}, ${formatPrice(listing)}`,
      );
      if (existing) {
        existing.setLngLat([listing.longitude, listing.latitude]);
        existing.getPopup()?.setDOMContent(link);
      } else {
        markers.set(
          listing.address,
          new maplibregl.Marker({ element: pin, anchor: "bottom" })
            .setLngLat([listing.longitude, listing.latitude])
            .setPopup(new maplibregl.Popup().setDOMContent(link))
            .addTo(map),
        );
      }
    }
  }
}

async function loadSearch() {
  if (searchBusy) return;
  searchBusy = true;
  renderResults();
  const button = document.querySelector<HTMLButtonElement>("#load-more");
  if (button) button.disabled = true;
  const refresh = document.querySelector<HTMLButtonElement>("#refresh");
  const sourceSave = document.querySelector<HTMLButtonElement>(
    "#discovery-settings button",
  );
  if (refresh) refresh.disabled = true;
  if (sourceSave) sourceSave.disabled = true;
  try {
    const result = await discover(relays, until);
    merge(result.events);
    reports = result.reports;
    const batchTimes = result.events
      .filter((event) => event.kind === 30402)
      .map((event) => event.created_at);
    if (batchTimes.length) until = Math.min(until - 1, ...batchTimes) - 1;
    await loadDeletions(
      events
        .filter((event) => event.kind === 30402)
        .map((event) => event.pubkey),
    );
    await writeLocal("events", events);
    document.querySelector("#relay-reports")!.textContent =
      `${reports.join(" · ")}. Empty responses can indicate no matches, access restrictions, or timeouts; they do not establish complete coverage.`;
  } finally {
    searchBusy = false;
    if (button) button.disabled = false;
    if (refresh) refresh.disabled = false;
    if (sourceSave) sourceSave.disabled = false;
    renderResults();
  }
}

async function connect() {
  const attempt = ++identityGeneration;
  if (pubkey) {
    composerIdentityAdopted = false;
    publishingIdentity.reset();
    clearQueuedPhotos();
    closeLocalPreview();
    try {
      sessionStorage.removeItem("vastgoed-pubkey");
    } catch {
      /* Storage may be disabled. */
    }
    pubkey = "";
    editing = null;
    pending = null;
    profileEvent = undefined;
    relayEvent = undefined;
    profileReady = false;
    accountWriteRelays = [];
    dashboardLoading = false;
    if (page === "dashboard")
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    updateIdentity();
    if (page === "dashboard") renderDashboard();
    return;
  }
  if (!window.nostr)
    throw new Error(
      "Install a NIP-07 browser extension such as nos2x or Alby to manage listings. Browsing and email signup do not need an extension.",
    );
  const key = await window.nostr.getPublicKey();
  if (attempt !== identityGeneration) return;
  if (!/^[a-f0-9]{64}$/.test(key))
    throw new Error("The extension returned an invalid public key.");
  await useIdentity(key);
}

async function useIdentity(key: string) {
  composerIdentityAdopted = false;
  publishingIdentity.reset();
  clearQueuedPhotos();
  const generation = ++identityGeneration;
  dashboardLoad++;
  pubkey = key;
  editing = null;
  pending = null;
  profileEvent = undefined;
  relayEvent = undefined;
  dashboardReports = [];
  accountWriteRelays = [];
  relays = DEFAULT_RELAYS;
  blossom = DEFAULT_BLOSSOM;
  try {
    sessionStorage.setItem("vastgoed-pubkey", key);
  } catch {
    /* Signing still works without session storage. */
  }
  const saved = await readLocal<{ relays: string[]; blossom: string } | null>(
    `settings:${key}`,
    null,
  );
  if (key !== pubkey || generation !== identityGeneration) return;
  if (saved) {
    try {
      relays = relayUrls(saved.relays.join(","));
    } catch {
      relays = DEFAULT_RELAYS;
    }
    blossom = safeUrl(saved.blossom) ?? DEFAULT_BLOSSOM;
  }
  updateIdentity();
  if (page === "dashboard") await loadDashboard();
  else location.assign(route("dashboard"));
}

function updateIdentity() {
  document
    .querySelectorAll("[data-identity]")
    .forEach(
      (node) =>
        (node.textContent = pubkey
          ? `${npub(pubkey).slice(0, 15)}…`
          : "Not connected"),
    );
  document
    .querySelectorAll("[data-connect]")
    .forEach(
      (node) => (node.textContent = pubkey ? "Disconnect" : "Connect Nostr"),
    );
}

async function signedPublish(template: EventTemplate, key: string) {
  if (publishing)
    throw new Error(
      "Wait for the current signing or publication request to finish.",
    );
  publishing = true;
  const generation = identityGeneration;
  const baseline = editing;
  try {
    publishingIdentity.assertReady(key);
    updateComposerControls();
    const event = await sign(template, key, publishingIdentity.signer(key));
    if (key !== pubkey || generation !== identityGeneration)
      throw new Error(
        "Identity changed during signing. Reconnect and try again.",
      );
    pending = event;
    // Retain the address even if a relay stores the event but loses its acknowledgement.
    if (event.kind === 30402 && editing === baseline) editing = event;
    await sendPending();
  } finally {
    publishing = false;
    updateComposerControls();
  }
}

async function sendPending() {
  if (!pending) return;
  const event = pending;
  const generation = identityGeneration;
  if (event.pubkey !== pubkey)
    throw new Error(
      "Connect the identity that signed this event before retrying.",
    );
  const retry = document.querySelector<HTMLButtonElement>("#retry-publish");
  if (retry) retry.hidden = false;
  const destinations = [...new Set([...accountWriteRelays, ...relays])].slice(
    0,
    12,
  );
  const result = await publish(event, destinations);
  merge([event]);
  await writeLocal("events", events);
  if (event.pubkey !== pubkey || generation !== identityGeneration) return;
  if (event.kind === 0) profileEvent = event;
  if (event.kind === 10002) relayEvent = event;
  if (
    page === "dashboard" &&
    ((event.kind === 30402 && editing?.id === event.id) ||
      event.kind === 0 ||
      event.kind === 10002)
  )
    renderDashboard();
  message(
    `${result} ${result.startsWith(`${destinations.length}/${destinations.length}`) ? "" : "Partial success: retry to reach the remaining relays."}`,
  );
}

function ownListings() {
  const latest = new Map<string, Event>();
  for (const event of events.filter(
    (e) => e.kind === 30402 && e.pubkey === pubkey,
  )) {
    const identifier = event.tags.find((t) => t[0] === "d")?.[1] ?? "";
    const old = latest.get(identifier);
    if (
      !old ||
      old.created_at < event.created_at ||
      (old.created_at === event.created_at && old.id > event.id)
    )
      latest.set(identifier, event);
  }
  return [...latest.values()]
    .filter((event) => !deleted(event))
    .sort((a, b) => b.created_at - a.created_at);
}

async function loadDashboard() {
  const load = ++dashboardLoad;
  const generation = identityGeneration;
  const key = pubkey;
  dashboardLoading = true;
  profileReady = false;
  dashboardReports = ["Discovering your profile and advertised relays…"];
  renderDashboard();
  const current = () =>
    key === pubkey &&
    generation === identityGeneration &&
    load === dashboardLoad;
  const bootstrap = [...new Set([...DEFAULT_RELAYS, ...relays])];
  const metadata = await Promise.allSettled([
    query(bootstrap, { authors: [key], kinds: [10002], limit: 10 }),
    query(bootstrap, { authors: [key], kinds: [0], limit: 10 }),
  ]);
  if (!current()) return;
  metadata.forEach((result) => {
    if (result.status === "fulfilled") merge(result.value);
  });
  const newest = (kind: number) =>
    events
      .filter((e) => e.pubkey === key && e.kind === kind)
      .sort(
        (a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id),
      )[0];
  profileEvent = newest(0);
  relayEvent = newest(10002);
  const advertised = (relayEvent?.tags ?? [])
    .filter((tag) => tag[0] === "r" && tag[2] !== "read")
    .flatMap((tag) => {
      try {
        return relayUrls(tag[1]);
      } catch {
        return [];
      }
    });
  const sources = [
    ...new Set([...advertised, ...relays, ...DEFAULT_RELAYS]),
  ].slice(0, 12);
  accountWriteRelays = [...new Set(advertised)].slice(0, 8);
  dashboardReports = sources.map((url) => `${new URL(url).host}: searching`);
  renderDashboard();
  // Own listings are queried by author, without site-specific tags or origins.
  const results = await Promise.allSettled(
    sources.map(async (url) => {
      const [listings, deletions, profiles] = await Promise.all([
        query([url], { authors: [key], kinds: [30402], limit: 300 }),
        query([url], { authors: [key], kinds: [5], limit: 300 }),
        query([url], { authors: [key], kinds: [0], limit: 5 }),
      ]);
      if (current()) {
        merge([...listings, ...deletions, ...profiles]);
        const index = sources.indexOf(url);
        dashboardReports[index] =
          `${new URL(url).host}: ${listings.length} listing events returned`;
        updateDashboardCoverage();
      }
      return listings;
    }),
  );
  if (!current()) return;
  results.forEach((result, index) => {
    if (result.status === "rejected")
      dashboardReports[index] =
        `${new URL(sources[index]).host}: request failed`;
  });
  profileEvent = newest(0);
  profileReady = true;
  dashboardLoading = false;
  renderDashboard();
  await writeLocal("events", events);
}

function profileData(event?: Event): Record<string, unknown> {
  try {
    const data = JSON.parse(event?.content ?? "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

const clientViews = [
  [
    "listings",
    "My Listings",
    "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  ],
  [
    "profile",
    "Profile",
    "M20 21v-2a7 7 0 0 0-14 0v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  ],
  ["relays", "Relays", "M4 6h16v5H4z M4 15h16v5H4z M8 8h1 M8 17h1"],
  ["media", "Media & Storage", "M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M16 7h1"],
  ["email", "Newsletter", "M3 5h18v14H3z M3 5l9 8 9-8"],
  ["editor", "New Listing", "M12 4v16 M4 12h16"],
];

function dashboardView() {
  const value = location.hash.slice(1);
  return clientViews.some(([key]) => key === value) ? value : "listings";
}

function setDashboardView(view: string) {
  if (location.hash === `#${view}`) showDashboardView();
  else location.hash = view;
}

function updateDashboardCoverage() {
  const status = app?.querySelector<HTMLElement>(".client-status");
  const count = ownListings().length;
  if (status)
    status.textContent = !pubkey
      ? "No private key required"
      : dashboardLoading
        ? "Searching your relays…"
        : `${count} ${count === 1 ? "listing" : "listings"} loaded`;
  const reports = app?.querySelector<HTMLElement>("#dashboard-coverage");
  if (reports) reports.textContent = dashboardReports.join(" · ");
}

function showDashboardView() {
  if (!app || page !== "dashboard") return;
  const view = dashboardView();
  app
    .querySelectorAll<HTMLElement>("[data-client-view]")
    .forEach(
      (node) =>
        (node.hidden =
          node.dataset.clientView !==
          (!pubkey && view !== "email" && view !== "editor"
            ? "listings"
            : view)),
    );
  app
    .querySelectorAll<HTMLAnchorElement>("[data-client-nav]")
    .forEach((node) => {
      if (node.dataset.clientNav === view)
        node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
  const title = app.querySelector<HTMLElement>("#client-view-title");
  if (title)
    title.textContent = pubkey
      ? view === "editor" && editing
        ? "Edit Listing"
        : (clientViews.find(([key]) => key === view)?.[1] ?? "My Listings")
      : view === "email"
        ? "Newsletter & membership"
        : view === "editor"
          ? "Create your free listing"
          : "Your Nostr workspace";
  const wasOpen = app
    .querySelector(".client-shell")
    ?.classList.contains("menu-open");
  app.querySelector(".client-shell")?.classList.remove("menu-open");
  if (wasOpen && title) {
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }
  app.querySelector("#client-menu")?.setAttribute("aria-expanded", "false");
  const active = app.querySelector<HTMLElement>(`[data-client-view="${view}"]`);
  if (active)
    active.setAttribute(
      "aria-label",
      clientViews.find(([key]) => key === view)?.[1] ?? view,
    );
}

window.addEventListener("hashchange", showDashboardView);

function mountClientShell(views: Record<string, HTMLElement>) {
  if (!app) return;
  const profile = profileData(profileEvent);
  const avatar = safeUrl(String(profile.picture ?? ""));
  const name = String(
    profile.display_name ||
      profile.name ||
      (pubkey ? "Nostr account" : "Not connected"),
  );
  const icon = (path: string) =>
    `<svg class="client-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${path}"/></svg>`;
  const retry = app.querySelector<HTMLElement>("#retry-publish");
  app.innerHTML = `<div class="client-shell"><header class="client-mobile-bar"><a class="wordmark" href="${route("search")}">${brandMarkup()}</a><button id="client-menu" aria-expanded="false" aria-controls="client-sidebar" aria-label="Open navigation">${icon("M3 6h18 M3 12h18 M3 18h18")}</button></header><button class="client-backdrop" aria-label="Close navigation" tabindex="-1"></button><aside class="client-sidebar" id="client-sidebar" aria-label="Client sidebar"><a class="client-brand wordmark" href="${route("search")}">${brandMarkup()}</a><div class="client-account">${avatar ? `<img class="client-avatar" src="${escape(avatar)}" alt="" referrerpolicy="no-referrer">` : `<span class="client-avatar" aria-hidden="true">${escape(name.slice(0, 1).toUpperCase())}</span>`}<div><strong class="client-account-name">${escape(name)}</strong><span class="client-account-key" title="${pubkey ? npub(pubkey) : ""}">${pubkey ? `${npub(pubkey).slice(0, 13)}…${npub(pubkey).slice(-5)}` : "Extension or public npub"}</span></div></div><nav class="client-nav" aria-label="Dashboard navigation">${clientViews.map(([key, label, path]) => `<a href="#${key}" data-client-nav="${key}">${icon(path)}<span>${label}</span></a>`).join("")}</nav><div class="client-sidebar-footer"><a href="${route("search")}" class="client-browse">${icon("M3 11l9-8 9 8 M5 10v11h14V10 M10 21v-7h4v7")}Browse Properties</a><button class="client-account-switch button-secondary" id="switch-account">${pubkey ? "Switch account / Disconnect" : "Connect an account"}</button><p class="client-status" role="status" aria-live="polite">${pubkey ? "Loading account…" : "No private key required"}</p></div></aside><div class="client-workspace"><div class="client-view-heading"><div><p class="eyebrow">Vastgoed / Nostr client</p><h1 id="client-view-title">My Listings</h1></div>${pubkey ? '<button id="reload-dashboard" class="button-secondary button-small">Refresh from relays</button>' : ""}</div><div class="client-main"></div>${pubkey ? '<details class="client-coverage"><summary>Discovery coverage</summary><p id="dashboard-coverage" class="muted"></p><p class="muted">Results depend on the relays queried and may be incomplete. Empty replies can mean no matches, access restrictions, or a timeout.</p></details>' : ""}</div></div>`;
  const main = app.querySelector(".client-main")!;
  app
    .querySelector(".client-sidebar")
    ?.insertAdjacentHTML(
      "afterbegin",
      '<button id="client-close" class="button-secondary client-close">Close navigation</button>',
    );
  for (const [key, node] of Object.entries(views)) {
    node.dataset.clientView = key;
    node.classList.add("client-view");
    node.inert = dashboardLoading && key !== "listings" && key !== "email";
    main.append(node);
  }
  if (retry) {
    retry.classList.add("client-retry");
    main.append(retry);
  }
  const refresh = app.querySelector<HTMLButtonElement>("#reload-dashboard");
  const sidebarFooter = app.querySelector(".client-sidebar-footer");
  if (sidebarFooter) mountLanguageSelector(sidebarFooter);
  if (refresh) refresh.disabled = dashboardLoading;
  if (dashboardLoading)
    main.insertAdjacentHTML(
      "afterbegin",
      '<p class="client-notice" role="status">Loading your account from its relays. Editing becomes available when discovery finishes.</p>',
    );
  app.querySelectorAll<HTMLAnchorElement>("[data-client-nav]").forEach((link) =>
    link.addEventListener("click", (event) => {
      if (link.dataset.clientNav === "editor" && editing) {
        event.preventDefault();
        editing = null;
        clearQueuedPhotos();
        setDashboardView("editor");
        renderDashboard();
      }
    }),
  );
  app.querySelector("#switch-account")?.addEventListener("click", () => {
    if (pubkey) run(connect);
    else app?.querySelector<HTMLInputElement>('[name="npub"]')?.focus();
  });
  const closeMenu = () => {
    app?.querySelector(".client-shell")?.classList.remove("menu-open");
    app?.querySelector("#client-menu")?.setAttribute("aria-expanded", "false");
    app?.querySelector<HTMLButtonElement>("#client-menu")?.focus();
  };
  app.querySelector("#client-menu")?.addEventListener("click", () => {
    const open = app
      ?.querySelector(".client-shell")
      ?.classList.toggle("menu-open");
    app
      ?.querySelector("#client-menu")
      ?.setAttribute("aria-expanded", String(!!open));
    if (open) app?.querySelector<HTMLAnchorElement>(".client-nav a")?.focus();
  });
  app.querySelector(".client-backdrop")?.addEventListener("click", closeMenu);
  app.querySelector("#client-close")?.addEventListener("click", closeMenu);
  app.querySelector(".client-shell")?.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Escape") {
      closeMenu();
      app?.querySelector<HTMLButtonElement>("#client-menu")?.focus();
    }
    if (
      (event as KeyboardEvent).key === "Tab" &&
      app?.querySelector(".menu-open")
    ) {
      const controls = [
        ...app.querySelectorAll<HTMLElement>(
          ".client-sidebar a, .client-sidebar button",
        ),
      ].filter((node) => node.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (
        (event as KeyboardEvent).shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !(event as KeyboardEvent).shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first?.focus();
      }
    }
  });
  updateDashboardCoverage();
  showDashboardView();
}

function renderDashboard() {
  if (!app) return;
  let anonymousLogin: HTMLElement | undefined;
  if (!pubkey) {
    app.innerHTML =
      '<section class="panel empty-state"><p class="eyebrow">Your property workspace</p><h1>Open doors. Keep your keys.</h1><p>Connect a NIP-07 browser extension to manage your profile, properties and relays. We never ask for your private key.</p><button id="dashboard-connect" class="button">Connect Nostr</button></section>';
    const login = app.querySelector<HTMLElement>("section")!;
    login.classList.add("client-empty");
    const signupDivider = login.querySelector("hr");
    if (signupDivider) {
      while (signupDivider.nextSibling) signupDivider.nextSibling.remove();
      signupDivider.remove();
    }
    login.insertAdjacentHTML(
      "beforeend",
      '<div class="client-signup-prompt"><h3>Newsletter &amp; membership</h3><p>Stay in the loop.</p><a class="button button-secondary" href="#email">Sign up for the newsletter</a></div>',
    );
    login.querySelector("h1")!.textContent = "Your listings. Your identity.";
    login
      .querySelector("h1")!
      .insertAdjacentHTML(
        "afterend",
        '<p>Load existing listings with your public npub, or connect your browser extension. Signing is only needed to publish changes.</p><form id="npub-login" class="client-login-form"><label class="field">Your npub<input name="npub" placeholder="npub1…" autocomplete="off" required spellcheck="false"></label><button class="button">Load my listings</button></form><p class="muted">Never enter an nsec or private key.</p>',
      );
    anonymousLogin = login;
    document
      .querySelector("#npub-login")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget as HTMLFormElement).get("npub"),
        ).trim();
        run(async () => {
          let decoded;
          try {
            decoded = nip19.decode(value);
          } catch {
            throw new Error(
              "Enter a valid public npub. Never enter a private key.",
            );
          }
          if (decoded.type !== "npub")
            throw new Error(
              "Enter a public npub, not an nsec or another Nostr identifier.",
            );
          await useIdentity(decoded.data);
        });
      });
    document
      .querySelector("#dashboard-connect")
      ?.addEventListener("click", () => run(connect));
  }
  const tag = (name: string) =>
    editing?.tags.find((t) => t[0] === name)?.[1] ?? "";
  const price = editing?.tags.find((t) => t[0] === "price");
  const profile = profileData(profileEvent);
  app.innerHTML = `<div class="dashboard-grid"><section class="panel"><div class="results-header"><h2>Your listings</h2><button id="new-listing" class="button-secondary button-small">New listing</button></div><div>${
    ownListings()
      .map((event) => {
        const item = parseListing({
          ...event,
          tags: [...event.tags, ["t", "real-estate"]],
        });
        return `<div class="relay-row"><div><strong>${escape(item?.title ?? "Unsupported listing")}</strong><p class="muted">${escape(item?.status ?? "Unknown status")}</p></div><div class="actions"><button class="button-secondary button-small" data-edit="${event.id}">Edit</button><button class="button-secondary button-small" data-delete="${event.id}">Delete</button></div></div>`;
      })
      .join("") ||
    '<p class="muted">No listings loaded from these relays yet.</p>'
  }</div></section><section class="panel"><h2>${editing ? "Edit property" : "List a property"}</h2><form id="listing-form"><div class="form-grid">${field("title", "Title", tag("title"), "text", 'required maxlength="160"')}${field("summary", "Short summary", tag("summary"))}${field("location", "Location", tag("location"), "text", 'required placeholder="City, region, country"')}${field("country", "Country code", tag("country"), "text", 'maxlength="2" placeholder="NL"')}${select(
    "transaction",
    "Transaction",
    [
      ["sale", "For sale"],
      ["rent", "For rent"],
    ],
    tag("transaction") || "sale",
  )}${select("propertyType", "Property type", types.slice(1), tag("property_type") || "house")}${field("price", "Price (blank = on request)", price?.[1] ?? "", "number", 'min="0" step="any"')}${field("currency", "Currency code", (price?.[2] ?? tag("currency")) || "EUR", "text", 'required minlength="3" maxlength="3"')}${select(
    "frequency",
    "Rental period",
    [
      ["", "One-time / not supplied"],
      ["month", "Per month"],
      ["week", "Per week"],
      ["year", "Per year"],
      ["day", "Per day"],
    ],
    price?.[3] ?? tag("frequency"),
  )}${field("bedrooms", "Bedrooms", tag("bedrooms"), "number", 'min="0" step="1"')}${field("bathrooms", "Bathrooms", tag("bathrooms"), "number", 'min="0" step="0.5"')}${field("area", "Area in m²", tag("area"), "number", 'min="0" step="any"')}${field("latitude", "Latitude (optional)", tag("latitude"), "number", 'min="-90" max="90" step="any"')}${field("longitude", "Longitude (optional)", tag("longitude"), "number", 'min="-180" max="180" step="any"')}${select(
    "status",
    "Availability",
    [
      ["active", "Active"],
      ["sold", "Sold"],
      ["rented", "Rented"],
      ["withdrawn", "Withdrawn"],
    ],
    tag("status") || "active",
  )}</div><label class="field">Description / public contact details<textarea name="description" rows="7" required>${escape(editing?.content ?? "")}</textarea></label><label class="field">Image URLs (HTTPS, one per line)<textarea name="images" rows="3">${escape(
    editing?.tags
      .filter((t) => t[0] === "image")
      .map((t) => t[1])
      .join("\n") ?? "",
  )}</textarea></label><label class="field">Upload a photograph<input type="file" id="image-upload" accept="image/jpeg,image/png,image/webp"></label><p class="muted">Uploads are public. Images are resized and re-encoded to strip EXIF. Review photos for visible private information.</p><div class="actions"><button class="button" id="publish-listing">Sign and publish</button><button type="button" id="save-draft" class="button-secondary">Save local draft</button><button type="button" id="restore-draft" class="button-secondary">Restore local draft</button></div></form></section><section class="panel"><h2>Your public profile</h2><form id="profile-form">${field("name", "Name", String(profile.name ?? ""))}${field("display_name", "Display name", String(profile.display_name ?? ""))}<label class="field">About<textarea name="about">${escape(profile.about ?? "")}</textarea></label>${field("picture", "Picture URL", String(profile.picture ?? ""), "url")}${field("website", "Website", String(profile.website ?? ""), "url")}<button class="button">Sign profile update</button></form><p class="muted">Other profile fields are preserved. Changes affect your identity across Nostr clients.</p></section><section class="panel"><h2>Relays and media</h2><form id="settings-form">${field("relays", "Session publishing / read relays", relays.join(", "))}${field("blossom", "Blossom upload server", blossom, "url", "required")}<button class="button">Save browser settings</button></form><button class="button-secondary" id="publish-relays">Publish these as my NIP-65 relay list</button><p class="muted">Publishing replaces your global relay list with these relays as read/write relays. It does not change the public discovery settings.</p><button id="retry-publish" class="button-secondary" ${pending ? "" : "hidden"}>Retry last signed event</button><button id="clear-cache" class="button-secondary">Clear listing cache</button><hr><h3>Email membership</h3><p class="muted">Email signup is separate from Nostr. Verified npub pairing is deferred.</p>${preview ? "" : '<a href="#/portal/account" class="button-secondary">Email account / newsletter</a>'}</section></div>`;
  const listingPanel = app.querySelector<HTMLElement>(
    ".dashboard-grid > section",
  )!;
  listingPanel.querySelector("h2")!.textContent = "My Listings";
  const list = ownListings();
  listingPanel.classList.add("client-listings");
  listingPanel.querySelectorAll<HTMLElement>(".relay-row").forEach((row) => {
    const id =
      row.querySelector<HTMLButtonElement>("[data-edit]")?.dataset.edit;
    const event = list.find((event) => event.id === id);
    if (!event) return;
    const item = parseListing({
      ...event,
      tags: [...event.tags, ["t", "real-estate"]],
    });
    row.classList.add("client-property-row");
    row.dataset.availability = item?.status || "active";
    row.querySelector("div")?.classList.add("client-property-info");
    row.querySelector(".actions")?.classList.add("client-property-actions");
    row.insertAdjacentHTML(
      "afterbegin",
      item?.images[0]
        ? `<img class="client-property-thumb" src="${escape(item.images[0])}" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : '<span class="client-property-thumb client-property-placeholder" aria-hidden="true">N99</span>',
    );
    const info = row.querySelector(".client-property-info");
    if (item && info) {
      const priceLine = info.querySelector("p")!;
      priceLine.innerHTML = `<span data-user-content>${escape(item.location || t("Location not supplied"))}</span> · ${priceMarkup(item)}`;
      info.insertAdjacentHTML(
        "beforeend",
        `<span class="badge">${escape(item.status)}</span>`,
      );
      row
        .querySelector(".actions")
        ?.insertAdjacentHTML(
          "afterbegin",
          `<a class="button-secondary button-small" href="${addressLink(item)}">View</a>`,
        );
    }
  });
  listingPanel
    .querySelector(".results-header")
    ?.insertAdjacentHTML(
      "afterend",
      '<div class="client-list-filters" role="group" aria-label="Listing status"><button class="button-secondary button-small" data-listing-filter="all" aria-pressed="true">All listings</button><button class="button-secondary button-small" data-listing-filter="active" aria-pressed="false">Active</button><button class="button-secondary button-small" data-listing-filter="unavailable" aria-pressed="false">Sold / Rented / Withdrawn</button><button class="button-secondary button-small" id="resume-local-draft">Resume local draft</button></div><p id="client-filter-count" class="muted" role="status"></p>',
    );
  listingPanel.insertAdjacentHTML(
    "afterbegin",
    `<div class="client-list-summary"><div><strong>${list.length}</strong><span>Loaded listings</span></div><div><strong>${list.filter((event) => (event.tags.find((t) => t[0] === "status")?.[1] || "active") === "active").length}</strong><span>Active</span></div><div><strong>${dashboardLoading ? "Searching" : "Updated"}</strong><span>Relay discovery</span></div></div>`,
  );
  const empty = listingPanel.querySelector<HTMLElement>("div > p.muted");
  if (!list.length && empty)
    empty.textContent = dashboardLoading
      ? "Searching your advertised relays for existing listings…"
      : "No NIP-99 listings were returned by these relays. Check Relays, add a missing relay, and refresh.";
  const editorPanel = app
    .querySelector("#listing-form")!
    .closest<HTMLElement>("section")!;
  if (!pubkey)
    editorPanel.insertAdjacentHTML(
      "afterbegin",
      '<div class="guest-composer-intro"><p class="eyebrow">Publish for free</p><h2>Start with your property, not an account.</h2><p>Add the details and choose your photographs first. No email signup is needed. Choose a publishing identity when you are ready.</p></div>',
    );
  editorPanel
    .querySelector("#listing-form .actions")
    ?.before(publishingIdentity.element);
  publishingIdentity.refresh();
  editorPanel.querySelector("#image-upload")?.setAttribute("multiple", "");
  editorPanel
    .querySelector("#image-upload")
    ?.closest("label")
    ?.insertAdjacentHTML(
      "afterend",
      '<div class="composer-photo-queue" id="composer-photo-queue"></div><button class="button-secondary" type="button" id="upload-queued-photos">Upload selected photos</button><p class="muted">Selected photos stay on this device until you choose a signer and upload. Uploads are public.</p>',
    );
  const draftStorageKey = `draft:${pubkey || "guest"}`;
  editorPanel
    .querySelector("#save-draft")
    ?.insertAdjacentHTML(
      "beforebegin",
      '<button type="button" id="preview-listing" class="button-secondary">Preview listing</button>',
    );
  editorPanel
    .querySelector("h2")!
    .insertAdjacentHTML(
      "afterend",
      '<p class="client-notice">Published descriptions, contact details, images and coordinates are public. Choose an extension or a new key pair to sign and publish. Keep your backup safe.</p>',
    );
  const profilePanel = app
    .querySelector("#profile-form")!
    .closest<HTMLElement>("section")!;
  const relayPanel = app
    .querySelector("#settings-form")!
    .closest<HTMLElement>("section")!;
  const mediaPanel = document.createElement("section");
  mediaPanel.className = "panel";
  mediaPanel.innerHTML = `<h2>Media & Storage</h2><p class="muted">Images are uploaded directly from your browser to Blossom. Your own server can be set here later.</p><form id="media-settings">${field("blossom", "Blossom upload server", blossom, "url", "required")}<button class="button">Save media settings</button></form><p class="muted">Upload property photographs from the listing editor. Files are public and are re-encoded to strip EXIF metadata.</p>`;
  app
    .querySelector<HTMLInputElement>('#settings-form [name="blossom"]')
    ?.closest("label")
    ?.remove();
  relayPanel.querySelector("h2")!.textContent = "Relays";
  relayPanel.querySelector("h2")!.insertAdjacentHTML(
    "afterend",
    `<p class="muted">Your advertised NIP-65 relays are used to find existing listings. Updates are sent to your write relays as well as the browser publishing settings.</p><div class="client-advertised-relays">${
      (relayEvent?.tags ?? [])
        .filter((tag) => tag[0] === "r")
        .map(
          (tag) =>
            `<div class="relay-row"><span class="identity-key">${escape(tag[1])}</span><span class="badge">${escape(tag[2] === "read" ? "Read" : tag[2] === "write" ? "Write" : "Read / Write")}</span></div>`,
        )
        .join("") ||
      '<p class="muted">No advertised relay list found. Browser settings and default relays are used as fallbacks.</p>'
    }</div>`,
  );
  const emailPanel = createEmailView(preview);
  const emailDivider = relayPanel.querySelector("hr");
  if (emailDivider) {
    while (emailDivider.nextSibling) emailDivider.nextSibling.remove();
    emailDivider.remove();
  }
  mountClientShell({
    listings: anonymousLogin ?? listingPanel,
    editor: editorPanel,
    profile: profilePanel,
    relays: relayPanel,
    media: mediaPanel,
    email: emailPanel,
  });
  renderQueuedPhotos();
  updateComposerControls();
  document
    .querySelector("#upload-queued-photos")
    ?.addEventListener("click", () =>
      run(async () => {
        await uploadQueuedPhotos(
          document.querySelector<HTMLFormElement>("#listing-form")!,
        );
      }),
    );
  document
    .querySelector("#media-settings")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = String(
        new FormData(event.currentTarget as HTMLFormElement).get("blossom"),
      );
      run(async () => {
        const url = safeUrl(value);
        if (!url) throw new Error("Blossom must use HTTPS.");
        await writeLocal(`settings:${pubkey}`, { relays, blossom: url });
        blossom = url;
        message("Media settings saved on this browser.");
      });
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-listing-filter]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const filter = button.dataset.listingFilter;
        let count = 0;
        document
          .querySelectorAll<HTMLElement>(".client-property-row")
          .forEach((row) => {
            row.hidden =
              filter === "active"
                ? row.dataset.availability !== "active"
                : filter === "unavailable"
                  ? row.dataset.availability === "active"
                  : false;
            if (!row.hidden) count++;
          });
        document
          .querySelectorAll("[data-listing-filter]")
          .forEach((node) =>
            node.setAttribute("aria-pressed", String(node === button)),
          );
        document.querySelector("#client-filter-count")!.textContent =
          `${count} ${count === 1 ? "listing" : "listings"} in this view`;
      }),
    );
  document
    .querySelector("#resume-local-draft")
    ?.addEventListener("click", () => {
      setDashboardView("editor");
      document.querySelector<HTMLButtonElement>("#restore-draft")?.click();
    });
  document
    .querySelector("#reload-dashboard")
    ?.addEventListener("click", () => run(loadDashboard));
  document
    .querySelectorAll<
      HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement
    >("#profile-form input, #profile-form textarea, #profile-form button")
    .forEach((control) => (control.disabled = !profileReady));
  document.querySelector("#new-listing")?.addEventListener("click", () => {
    editing = null;
    clearQueuedPhotos();
    renderDashboard();
    setDashboardView("editor");
  });
  document.querySelector("#preview-listing")?.addEventListener("click", () =>
    run(async () => {
      const form = document.querySelector<HTMLFormElement>("#listing-form")!;
      if (!form.reportValidity()) return;
      const input = listingInput(form);
      const tags = buildListingTags(input, "local-preview", now());
      const listing = parseListing({
        kind: 30402,
        created_at: now(),
        pubkey,
        content: input.description,
        tags,
        id: "",
        sig: "",
      });
      if (!listing)
        throw new Error(
          "Review the listing fields before opening the preview.",
        );
      previewListing = listing;
      const dialog = document.createElement("dialog");
      dialog.className = "listing-preview-dialog";
      dialog.setAttribute("aria-label", t("Listing preview"));
      const previousOverflow = document.body.style.overflow;
      previewDialog = dialog;
      document.body.append(dialog);
      renderLocalPreview();
      dialog.showModal();
      document.body.style.overflow = "hidden";
      dialog.addEventListener(
        "close",
        () => {
          document.body.style.overflow = previousOverflow;
          dialog.remove();
          if (previewDialog === dialog) {
            previewDialog = undefined;
            previewListing = undefined;
          }
          document
            .querySelector<HTMLButtonElement>("#preview-listing")
            ?.focus();
        },
        { once: true },
      );
    }),
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-edit]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        editing =
          events.find((event) => event.id === button.dataset.edit) ?? null;
        renderDashboard();
        setDashboardView("editor");
        document
          .querySelector("#listing-form")
          ?.scrollIntoView({ behavior: "smooth" });
      }),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-delete]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        run(async () => {
          const event = events.find(
            (event) => event.id === button.dataset.delete,
          );
          if (!event) return;
          if (
            !confirm(
              t(
                "Request deletion? Copies may remain on other relays and clients.",
              ),
            )
          )
            return;
          await signedPublish(
            {
              kind: 5,
              created_at: Math.max(now(), event.created_at + 1),
              tags: [
                ["e", event.id],
                [
                  "a",
                  `30402:${pubkey}:${event.tags.find((t) => t[0] === "d")?.[1]}`,
                ],
                ["k", "30402"],
              ],
              content: "Listing removed by author",
            },
            pubkey,
          );
          editing = null;
          renderDashboard();
          message(
            "Deletion request acknowledged. Network-wide removal is not guaranteed.",
          );
        }),
      ),
    );
  document
    .querySelector("#listing-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      run(async () => {
        const button =
          form.querySelector<HTMLButtonElement>("#publish-listing")!;
        button.disabled = true;
        try {
          publishingIdentity.assertReady(pubkey);
          let input = listingInput(form);
          const key = pubkey;
          const identifier =
            editing?.tags.find((t) => t[0] === "d")?.[1] ?? crypto.randomUUID();
          const publishedAt =
            Number(editing?.tags.find((t) => t[0] === "published_at")?.[1]) ||
            now();
          let tags = buildListingTags(input, identifier, publishedAt);
          await uploadQueuedPhotos(form);
          input = listingInput(form);
          tags = buildListingTags(input, identifier, publishedAt);
          // Preserve third-party metadata we do not edit, excluding obsolete coordinates.
          const managed = new Set([
            "d",
            "title",
            "summary",
            "published_at",
            "t",
            "vastgoed_schema",
            "location",
            "country",
            "currency",
            "transaction",
            "property_type",
            "status",
            "price",
            "frequency",
            "bedrooms",
            "bathrooms",
            "area",
            "latitude",
            "longitude",
            "image",
            "g",
          ]);
          tags.push(
            ...(editing?.tags.filter((tag) => !managed.has(tag[0])) ?? []),
          );
          await signedPublish(
            {
              kind: 30402,
              created_at: Math.max(now(), (editing?.created_at ?? 0) + 1),
              tags,
              content: input.description,
            },
            key,
          );
        } finally {
          button.disabled = false;
        }
      });
    });
  document.querySelector("#save-draft")?.addEventListener("click", () =>
    run(async () => {
      await writeLocal(draftStorageKey, {
        input: listingInput(document.querySelector("#listing-form")!),
        editing,
        photos: queuedPhotos.map((photo) => ({
          file: photo.file,
          uploaded: photo.uploaded,
        })),
      });
      message("Draft saved on this browser only.");
    }),
  );
  document.querySelector("#restore-draft")?.addEventListener("click", () =>
    run(async () => {
      const draft = await readLocal<{
        input: ListingInput;
        editing: Event | null;
        photos?: { file: File | Blob; uploaded?: string }[];
      } | null>(draftStorageKey, null);
      if (!draft)
        throw new Error("No draft saved for this identity on this browser.");
      editing = draft.editing;
      clearQueuedPhotos();
      for (const photo of (draft.photos ?? []).slice(0, 12)) {
        if (
          photo.file instanceof Blob &&
          photo.file.size <= 20 * 1024 * 1024 &&
          ["image/jpeg", "image/png", "image/webp"].includes(photo.file.type)
        ) {
          const file =
            photo.file instanceof File
              ? photo.file
              : new File([photo.file], "property-photo", {
                  type: photo.file.type,
                });
          queuedPhotos.push({
            id: crypto.randomUUID(),
            file,
            url: URL.createObjectURL(file),
            uploaded: photo.uploaded,
          });
        }
      }
      renderDashboard();
      const form = document.querySelector<HTMLFormElement>("#listing-form")!;
      for (const [name, value] of Object.entries(draft.input)) {
        const control = form.elements.namedItem(
          name,
        ) as HTMLInputElement | null;
        if (control)
          control.value = Array.isArray(value) ? value.join("\n") : value;
      }
      message("Local draft restored. Review before publishing.");
    }),
  );
  document
    .querySelector("#image-upload")
    ?.addEventListener("change", (event) => {
      const input = event.currentTarget as HTMLInputElement;
      const files = [...(input.files ?? [])];
      if (!files.length) return;
      const form = document.querySelector<HTMLFormElement>("#listing-form")!;
      run(async () => {
        try {
          if (queuedPhotos.length + files.length > 12)
            throw new Error("Choose at most 12 photographs per listing.");
          for (const file of files)
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 20 * 1024 * 1024
            )
              throw new Error("Choose a JPEG, PNG, or WebP image below 20 MB.");
          for (const file of files)
            queuedPhotos.push({
              id: crypto.randomUUID(),
              file,
              url: URL.createObjectURL(file),
            });
          renderQueuedPhotos();
          updateComposerControls();
          if (pubkey) {
            try {
              publishingIdentity.assertReady(pubkey);
            } catch {
              message(
                "Photographs selected locally. Choose a signer and save your key backup before uploading.",
              );
              return;
            }
            await uploadQueuedPhotos(form);
          } else
            message(
              "Photographs selected locally. Choose a signer when you are ready to upload and publish.",
            );
        } finally {
          input.value = "";
        }
      });
    });
  document
    .querySelector("#profile-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(
        new FormData(event.currentTarget as HTMLFormElement),
      );
      run(async () => {
        if (!profileReady)
          throw new Error("Wait for the existing profile to finish loading.");
        if (
          !profileEvent &&
          !confirm(
            t(
              "No existing profile was found on these relays. Publishing could replace a profile stored elsewhere and remove fields not shown here. Continue?",
            ),
          )
        )
          return;
        for (const key of ["picture", "website"])
          if (data[key] && !safeUrl(String(data[key])))
            throw new Error("Profile image and website must use HTTPS.");
        await signedPublish(
          {
            kind: 0,
            created_at: Math.max(now(), (profileEvent?.created_at ?? 0) + 1),
            tags: profileEvent?.tags ?? [],
            content: JSON.stringify({ ...profileData(profileEvent), ...data }),
          },
          pubkey,
        );
      });
    });
  document
    .querySelector("#settings-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget as HTMLFormElement);
      run(async () => {
        const next = relayUrls(String(data.get("relays")));
        const url = blossom;
        if (!url) throw new Error("Blossom must use HTTPS.");
        await writeLocal(`settings:${pubkey}`, { relays: next, blossom: url });
        relays = next;
        blossom = url;
        message(
          "Browser settings saved. Public relay discovery settings are unchanged.",
        );
      });
    });
  document.querySelector("#publish-relays")?.addEventListener("click", () =>
    run(async () => {
      if (
        !confirm(
          t(
            "Replace your global NIP-65 relay list with the saved browser relay settings, all marked read/write?",
          ),
        )
      )
        return;
      await signedPublish(
        {
          kind: 10002,
          created_at: Math.max(now(), (relayEvent?.created_at ?? 0) + 1),
          tags: relays.map((url) => ["r", url]),
          content: "",
        },
        pubkey,
      );
    }),
  );
  document
    .querySelector("#retry-publish")
    ?.addEventListener("click", () => run(sendPending));
  document.querySelector("#clear-cache")?.addEventListener("click", () =>
    run(async () => {
      await clearCache();
      events = [];
      message("Listing cache cleared. Local drafts have not been removed.");
    }),
  );
}

function closeLocalPreview() {
  previewDialog?.querySelector<HTMLDialogElement>("dialog[open]")?.close();
  previewDialog?.close();
}

function renderLocalPreview() {
  if (!previewDialog || !previewListing) return;
  previewDialog.querySelector<HTMLDialogElement>("dialog[open]")?.close();
  previewDialog.innerHTML =
    `<div class="preview-toolbar"><button type="button" class="button-secondary" data-close-preview data-i18n="Close preview">${t("Close preview")}</button></div>` +
    renderListingDetail(previewListing, profileData(profileEvent), {
      back: "#editor",
      profile: "#profile",
      report: "#editor",
      preview: true,
      localImages: queuedPhotos
        .filter((photo) => !photo.uploaded)
        .map((photo) => photo.url),
    });
  previewDialog
    .querySelector("[data-close-preview]")
    ?.addEventListener("click", closeLocalPreview);
  previewDialog
    .querySelector(".listing-back")
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      closeLocalPreview();
    });
  previewDialog
    .querySelector(".publisher-profile-link")
    ?.addEventListener("click", closeLocalPreview);
  bindListingGallery(previewDialog);
  translate(previewDialog);
}

function adoptPublishingIdentity(key: string) {
  if (editing && editing.pubkey !== key)
    throw new Error(
      "An existing listing must keep its original publishing identity.",
    );
  if (key !== pubkey) {
    composerIdentityAdopted = true;
    try {
      sessionStorage.removeItem("vastgoed-pubkey");
    } catch {
      /* Composer identities are memory-only. */
    }
    identityGeneration++;
    dashboardLoad++;
    pubkey = key;
    pending = null;
    profileEvent = undefined;
    relayEvent = undefined;
    accountWriteRelays = [];
    relays = DEFAULT_RELAYS;
    profileReady = false;
    dashboardLoading = false;
  }
  updateIdentity();
  const name = app?.querySelector<HTMLElement>(".client-account-name");
  if (name)
    name.textContent = String(
      profileData(profileEvent).name || t("Nostr account"),
    );
  const identity = app?.querySelector<HTMLElement>(".client-account-key");
  if (identity) {
    identity.textContent = `${npub(key).slice(0, 13)}…${npub(key).slice(-5)}`;
    identity.title = npub(key);
  }
  const accountButton = app?.querySelector("#switch-account");
  if (accountButton) accountButton.textContent = "Switch account / Disconnect";
  showDashboardView();
}

function clearQueuedPhotos() {
  queuedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
  queuedPhotos.length = 0;
}

function updateComposerControls() {
  publishingIdentity.element.inert = uploadingPhotos || publishing;
  const publishButton =
    document.querySelector<HTMLButtonElement>("#publish-listing");
  if (publishButton) publishButton.disabled = uploadingPhotos || publishing;
  const uploadButton = document.querySelector<HTMLButtonElement>(
    "#upload-queued-photos",
  );
  let ready = false;
  try {
    publishingIdentity.assertReady(pubkey);
    ready = true;
  } catch {
    /* Show the choices without opening a signing prompt. */
  }
  if (uploadButton)
    uploadButton.disabled =
      !ready ||
      uploadingPhotos ||
      publishing ||
      !queuedPhotos.some((photo) => !photo.uploaded);
  document
    .querySelectorAll<HTMLButtonElement>("[data-remove-photo]")
    .forEach((button) => (button.disabled = uploadingPhotos || publishing));
}

function renderQueuedPhotos() {
  const queue = document.querySelector("#composer-photo-queue");
  if (!queue) return;
  queue.innerHTML = queuedPhotos
    .map(
      (photo) =>
        `<div class="composer-photo-item"><img src="${escape(photo.url)}" alt="" decoding="async"><div><span data-user-content>${escape(photo.file.name)}</span><p>${photo.uploaded ? "Uploaded" : "Local photo, not uploaded"}</p></div><button type="button" class="button-secondary button-small" data-remove-photo="${photo.id}">Remove photo</button></div>`,
    )
    .join("");
  queue
    .querySelectorAll<HTMLButtonElement>("[data-remove-photo]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        if (uploadingPhotos || publishing) return;
        const index = queuedPhotos.findIndex(
          (photo) => photo.id === button.dataset.removePhoto,
        );
        const photo = queuedPhotos[index];
        if (!photo) return;
        if (photo.uploaded) {
          const field = document.querySelector<HTMLTextAreaElement>(
            '#listing-form [name="images"]',
          );
          if (field)
            field.value = field.value
              .split("\n")
              .filter((value) => value.trim() !== photo.uploaded)
              .join("\n");
        }
        URL.revokeObjectURL(photo.url);
        queuedPhotos.splice(index, 1);
        renderQueuedPhotos();
        updateComposerControls();
      }),
    );
  translate(queue);
}

async function uploadQueuedPhotos(form: HTMLFormElement) {
  if (!queuedPhotos.some((photo) => !photo.uploaded)) return;
  if (uploadingPhotos)
    throw new Error("Wait for the current photo upload to finish.");
  const key = pubkey;
  const generation = identityGeneration;
  publishingIdentity.assertReady(key);
  uploadingPhotos = true;
  updateComposerControls();
  try {
    for (const photo of queuedPhotos.filter((photo) => !photo.uploaded)) {
      message("Processing photograph and requesting upload authorization…");
      const url = await uploadImage(
        photo.file,
        blossom,
        key,
        publishingIdentity.signer(key),
      );
      if (
        key !== pubkey ||
        generation !== identityGeneration ||
        !form.isConnected
      )
        throw new Error(
          "The publishing identity has changed. Please try again.",
        );
      photo.uploaded = url;
      const images = form.elements.namedItem("images") as HTMLTextAreaElement;
      images.value = [
        ...new Set([...images.value.split("\n").filter(Boolean), url]),
      ].join("\n");
      renderQueuedPhotos();
    }
    message("Photograph uploaded. Publish the listing to share its URL.");
  } finally {
    uploadingPhotos = false;
    updateComposerControls();
  }
}

function listingInput(form: HTMLFormElement): ListingInput {
  const data = Object.fromEntries(new FormData(form));
  return {
    ...data,
    images: String(data.images ?? "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
  } as unknown as ListingInput;
}

async function showListing() {
  if (!app) return;
  app.innerHTML =
    '<p class="notice">Loading property from connected relays…</p>';
  const value = params.get("address") ?? "";
  const decoded = nip19.decode(value);
  if (decoded.type !== "naddr" || decoded.data.kind !== 30402)
    throw new Error("This is not a valid NIP-99 listing address.");
  const { pubkey: author, identifier } = decoded.data;
  const hints = (decoded.data.relays ?? []).slice(0, 8).flatMap((value) => {
    try {
      return relayUrls(value);
    } catch {
      return [];
    }
  });
  const sources = [...new Set([...hints, ...relays])].slice(0, 12);
  const loaded = await Promise.all([
    query(sources, {
      kinds: [30402],
      authors: [author],
      "#d": [identifier],
      limit: 20,
    }),
    query(sources, { kinds: [0], authors: [author], limit: 10 }),
  ]);
  merge(loaded.flat());
  await loadDeletions([author], sources);
  const latest = events
    .filter(
      (event) =>
        event.kind === 30402 &&
        event.pubkey === author &&
        event.tags.some((tag) => tag[0] === "d" && tag[1] === identifier),
    )
    .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))[0];
  const listing =
    latest && !deleted(latest)
      ? parseListing({
          ...latest,
          tags: [...latest.tags, ["t", "real-estate"]],
        })
      : null;
  if (!listing)
    throw new Error(
      "Listing unavailable, removed, or not found on the connected relays.",
    );
  const profile = events
    .filter((event) => event.kind === 0 && event.pubkey === author)
    .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))[0];
  detailContext = { listing, publisher: profileData(profile) };
  renderCurrentDetail();
}

function renderCurrentDetail() {
  if (!app || !detailContext) return;
  const { listing, publisher } = detailContext;
  const existingMap = app.querySelector("#property-map");
  app.querySelector<HTMLDialogElement>("dialog[open]")?.close();
  app.innerHTML = renderListingDetail(listing, publisher, {
    back: route("search"),
    profile: route("profile", { pubkey: npub(listing.pubkey) }),
    report: `mailto:hello@vastgoed.net?subject=${encodeURIComponent(`Listing report: ${listing.address}`)}`,
  });
  bindListingGallery(app);
  if (existingMap && app.querySelector("#property-map")) {
    app.querySelector("#property-map")!.replaceWith(existingMap);
    requestAnimationFrame(() => map?.resize());
  }
  document.querySelector("#copy-link")?.addEventListener("click", () =>
    run(async () => {
      await navigator.clipboard.writeText(location.href);
      message("Listing link copied.");
    }),
  );
  document.querySelector("#copy-npub")?.addEventListener("click", () =>
    run(async () => {
      await navigator.clipboard.writeText(npub(listing.pubkey));
      message("Public key copied.");
    }),
  );
  translate(app);
  if (!existingMap && listing.latitude !== null && listing.longitude !== null)
    run(async () => {
      await createMap();
      map?.jumpTo({
        center: [listing.longitude!, listing.latitude!],
        zoom: 12,
      });
      if (map && maplibregl)
        new maplibregl.Marker({ color: "#163e32" })
          .setLngLat([listing.longitude!, listing.latitude!])
          .addTo(map);
    });
}

async function showProfile() {
  if (!app) return;
  const decoded = nip19.decode(params.get("pubkey") ?? "");
  if (decoded.type !== "npub")
    throw new Error("Provide a valid npub to view a profile.");
  const author = decoded.data;
  merge(
    await query(relays, {
      authors: [author],
      kinds: [0, 30402, 5],
      limit: 200,
    }),
  );
  const event = events
    .filter((e) => e.pubkey === author && e.kind === 0)
    .sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id))[0];
  const profile = profileData(event);
  const image = safeUrl(String(profile.picture ?? ""));
  app.innerHTML = `<section class="panel profile-header">${image ? `<img class="profile-avatar" src="${escape(image)}" alt="" referrerpolicy="no-referrer">` : ""}<div><p class="eyebrow">Public Nostr profile</p><h1>${escape(profile.display_name ?? profile.name ?? "Property publisher")}</h1><p class="identity-key">${npub(author)}</p><p class="description-text">${escape(profile.about ?? "")}</p></div></section><h2>Active listings loaded</h2><div class="listing-grid">${
    listings()
      .filter((listing) => listing.pubkey === author)
      .map(card)
      .join("") ||
    '<p class="empty-state">No active real estate listings found on the connected relays.</p>'
  }</div>`;
}

async function boot() {
  initI18n();
  initNavigation();
  if (page === "search" && location.hash === "#newsletter") {
    const destination = new URL("/guides/", location.href);
    if (getLanguage() !== "en" || params.has("lang"))
      destination.searchParams.set("lang", getLanguage());
    destination.hash = "newsletter";
    location.replace(destination);
    return;
  }
  document
    .querySelectorAll<HTMLFormElement>("[data-preview-newsletter]")
    .forEach((form) =>
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const feedback = form.querySelector<HTMLElement>(
          ".newsletter-feedback",
        );
        if (feedback)
          feedback.textContent =
            "Email signup requires the live Vastgoed site. No subscription was created in this local preview.";
      }),
    );
  app?.addEventListener(
    "error",
    (event) => {
      const image = event.target;
      if (
        !(image instanceof HTMLImageElement) ||
        !image.closest(".property-image")
      )
        return;
      const placeholder = document.createElement("span");
      placeholder.className = "image-placeholder";
      placeholder.textContent = "Photograph unavailable";
      image.replaceWith(placeholder);
    },
    true,
  );
  document
    .querySelectorAll("[data-connect]")
    .forEach((button) => button.addEventListener("click", () => run(connect)));
  if (!app) return;
  events = [];
  merge(await readLocal<Event[]>("events", []));
  const stored = await readLocal<string[]>("discovery-relays", DEFAULT_RELAYS);
  try {
    relays = relayUrls(stored.join(","));
  } catch {
    relays = DEFAULT_RELAYS;
  }
  try {
    const key = sessionStorage.getItem("vastgoed-pubkey") ?? "";
    if (/^[a-f0-9]{64}$/.test(key)) pubkey = key;
  } catch {
    /* Connecting remains available when session storage is disabled. */
  }
  if (pubkey && page === "dashboard") {
    const saved = await readLocal<{ relays: string[]; blossom: string } | null>(
      `settings:${pubkey}`,
      null,
    );
    if (saved) {
      try {
        relays = relayUrls(saved.relays.join(","));
      } catch {
        relays = DEFAULT_RELAYS;
      }
      blossom = safeUrl(saved.blossom) ?? DEFAULT_BLOSSOM;
    }
  }
  updateIdentity();
  if (page === "search") initSearch();
  else if (page === "dashboard") {
    if (pubkey) await loadDashboard();
    else renderDashboard();
  } else if (page === "contact") renderContact(app);
  else if (page === "guides") renderGuides(app);
  else if (page === "listing") await showListing();
  else if (page === "profile") await showProfile();
}

window.addEventListener("vastgoed:languagechange", () => {
  if (page === "search" && document.querySelector("#search-form"))
    renderResults();
  else if (page === "listing" && detailContext) renderCurrentDetail();
  else if (page === "dashboard") showDashboardView();
  document
    .querySelectorAll<HTMLElement>("[data-price-address]")
    .forEach((node) => {
      const listing = priceListings.get(node.dataset.priceAddress!);
      if (listing) node.textContent = formatPrice(listing);
    });
  if (previewDialog) renderLocalPreview();
});

window.addEventListener("popstate", () => {
  const form = document.querySelector<HTMLFormElement>("#search-form");
  if (page !== "search" || !form) return;
  const query = new URLSearchParams(location.search);
  resultsPage = readResultsPage(query);
  bounds = undefined;
  for (const element of form.elements) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement
    )
      element.value = query.get(element.name) ?? "";
  }
  document.querySelector<HTMLSelectElement>("#sort-order")!.value =
    query.get("sort") === "oldest" ? "oldest" : "newest";
  const language = query.get("lang");
  if (
    language === "en" ||
    language === "nl" ||
    language === "fr" ||
    language === "de"
  )
    setLanguage(language);
  renderResults();
});

run(boot);
window.addEventListener("pagehide", () => {
  if (composerIdentityAdopted) {
    identityGeneration++;
    pubkey = "";
    pending = null;
    editing = null;
    composerIdentityAdopted = false;
    profileEvent = undefined;
    relayEvent = undefined;
    const name = app?.querySelector(".client-account-name");
    if (name) name.textContent = "Not connected";
    const key = app?.querySelector(".client-account-key");
    if (key) {
      key.textContent = "Extension or public npub";
      key.removeAttribute("title");
    }
    const accountButton = app?.querySelector("#switch-account");
    if (accountButton) accountButton.textContent = "Connect an account";
    updateIdentity();
    showDashboardView();
  }
  publishingIdentity.reset();
  updateComposerControls();
});
