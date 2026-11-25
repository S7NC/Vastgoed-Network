import { nip19 } from "nostr-tools";
import { t, getLocale } from "./i18n";
import { formatPrice, safeUrl, type Listing } from "./model";

const escape = (value: unknown): string =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

const photoLabel = (current: number, total: number): string =>
  t("Photo {current} of {total}")
    .replace("{current}", String(current))
    .replace("{total}", String(total));

export function renderListingDetail(
  listing: Listing,
  publisher: Record<string, unknown>,
  links: {
    back: string;
    profile: string;
    report: string;
    preview?: boolean;
    localImages?: readonly string[];
  },
): string {
  const text = (key: string) => escape(t(key));
  const images = listing.images
    .map((url) => safeUrl(url))
    .filter((url): url is string => url !== null);
  if (links.preview)
    images.push(
      ...(links.localImages ?? []).filter((url) => {
        try {
          return (
            url.startsWith("blob:") && new URL(url).origin === location.origin
          );
        } catch {
          return false;
        }
      }),
    );
  let npub = listing.pubkey;
  try {
    npub = nip19.npubEncode(listing.pubkey);
  } catch {
    // Keep malformed imported identities readable without inventing an identity.
  }
  const name = [
    publisher.display_name,
    publisher.displayName,
    publisher.name,
  ].find(
    (value): value is string => typeof value === "string" && !!value.trim(),
  );
  const avatar =
    typeof publisher.picture === "string" ? safeUrl(publisher.picture) : null;
  const website =
    typeof publisher.website === "string" ? safeUrl(publisher.website) : null;
  const monogram = name
    ? Array.from(name.trim()).slice(0, 2).join("").toUpperCase()
    : "N";
  const shortNpub =
    npub.length > 24 ? `${npub.slice(0, 12)}...${npub.slice(-8)}` : npub;
  const number = new Intl.NumberFormat(getLocale());
  const propertyTypes: Record<string, string> = {
    house: "House",
    apartment: "Apartment",
    land: "Land",
    commercial: "Commercial",
    other: "Other",
    villa: "Villa",
    studio: "Studio",
    townhouse: "Townhouse",
  };
  const propertyType = Object.hasOwn(propertyTypes, listing.propertyType)
    ? propertyTypes[listing.propertyType]
    : undefined;
  const facts = [
    listing.bedrooms !== null
      ? ["Bedrooms", number.format(listing.bedrooms)]
      : null,
    listing.bathrooms !== null
      ? ["Bathrooms", number.format(listing.bathrooms)]
      : null,
    listing.area !== null
      ? ["Floor area", `${number.format(listing.area)} m²`]
      : null,
    listing.propertyType
      ? ["Property type", propertyType ? t(propertyType) : listing.propertyType]
      : null,
  ].filter((fact): fact is string[] => fact !== null);
  const updated = new Date(listing.createdAt * 1000);
  const validDate = Number.isFinite(updated.getTime());
  const dateLabel = validDate
    ? new Intl.DateTimeFormat(getLocale(), {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(updated)
    : t("Not supplied");
  const price =
    listing.price === null
      ? t("On request")
      : formatPrice({ ...listing, frequency: "" }, getLocale());
  const transaction =
    listing.transaction === "sale"
      ? "For sale"
      : listing.transaction === "rent"
        ? "For rent"
        : "Property";
  const statuses: Record<string, string> = {
    active: "Active",
    sold: "Sold",
    rented: "Rented",
    withdrawn: "Withdrawn",
  };
  const status = Object.hasOwn(statuses, listing.status)
    ? statuses[listing.status]
    : undefined;

  return `<article class="listing-detail">
    <nav class="listing-breadcrumb" aria-label="${text("Property navigation")}">
      <a class="listing-back" href="${escape(links.back)}"><span aria-hidden="true">&larr;</span> ${text(links.preview ? "Back to editor" : "Back to property search")}</a>
      ${links.preview ? "" : `<div class="listing-top-actions"><button type="button" id="copy-link" class="listing-text-button">${text("Copy listing link")}</button><a href="${escape(links.report)}">${text("Report listing")}</a></div>`}
    </nav>
    ${links.preview ? `<div class="listing-preview-notice" role="status"><strong>${text("Unpublished preview")}</strong><p>${text("This preview is only visible in this browser. Nothing has been signed or published.")}</p></div>` : ""}
    <header class="listing-heading">
      <div class="listing-heading-copy"><div class="listing-labels"><span class="listing-transaction">${text(transaction)}</span>${propertyType ? `<span>${text(propertyType)}</span>` : ""}</div>
        <h1 data-user-content>${escape(listing.title)}</h1>
        <p class="listing-address"${listing.location ? " data-user-content" : ""}>${listing.location ? escape(listing.location) : text("Location not supplied")}</p>
        ${listing.summary ? `<p class="listing-summary" data-user-content>${escape(listing.summary)}</p>` : ""}
      </div>
      <div class="listing-price"><p>${escape(price)}</p>${listing.frequency && listing.price !== null ? `<span data-user-content>/ ${text(listing.frequency)}</span>` : ""}</div>
    </header>
    ${listing.status !== "active" ? `<div class="listing-inactive" role="status"><strong${status ? "" : " data-user-content"}>${status ? text(status) : escape(listing.status)}</strong><p>${text("This listing is not active and is not shown in active search results.")}</p></div>` : ""}
    <section class="property-gallery${images.length === 1 ? " property-gallery-single" : ""}" aria-label="${text("Property photos")}">
      ${
        images.length
          ? images
              .map(
                (
                  url,
                  index,
                ) => `<button type="button" class="property-gallery-photo${index === 0 ? " property-gallery-main" : ""}" data-gallery-index="${index}" aria-label="${escape(photoLabel(index + 1, images.length))}"${index > 2 ? " hidden" : ""}>
        <img src="${escape(url)}" alt="${escape(listing.title)}" data-user-content ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer">
        <span class="gallery-image-fallback" hidden>${text("Photo unavailable")}</span>
        ${images.length > 1 && index === Math.min(2, images.length - 1) ? `<span class="gallery-view-all">${text("View all photos")} <span aria-hidden="true">(${images.length})</span></span>` : ""}
      </button>`,
              )
              .join("")
          : `<div class="property-gallery-empty"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="M10 54V25L32 9l22 16v29H10Z M25 54V35h14v19 M5 25 32 5l27 20"/></svg><p>${text("No photograph supplied")}</p></div>`
      }
    </section>
    <div class="listing-content-grid">
      <div class="listing-main-content">
        ${facts.length ? `<dl class="listing-key-facts">${facts.map(([label, value]) => `<div><dt>${text(label)}</dt><dd data-user-content>${escape(value)}</dd></div>`).join("")}</dl>` : ""}
        <section class="listing-section listing-about"><h2>${text("About this property")}</h2><p class="listing-language-note">${text("Listing content is shown in the publisher’s original language.")}</p>
          ${listing.description ? `<div class="description-text" data-user-content>${escape(listing.description)}</div>` : `<p class="muted">${text("No description supplied.")}</p>`}
        </section>
        <section class="listing-section"><h2>${text("Property details")}</h2><dl class="property-specifications">
          ${facts.map(([label, value]) => `<div><dt>${text(label)}</dt><dd data-user-content>${escape(value)}</dd></div>`).join("")}
          <div><dt>${text("Availability")}</dt><dd${status ? "" : " data-user-content"}>${status ? text(status) : escape(listing.status || t("Not supplied"))}</dd></div>
          ${links.preview ? "" : `<div><dt>${text("Last updated")}</dt><dd>${validDate ? `<time datetime="${updated.toISOString()}">${escape(dateLabel)}</time>` : escape(dateLabel)}</dd></div>`}
        </dl></section>
        <section class="listing-section listing-location"><h2>${text("Location")}</h2>${listing.location ? `<p class="listing-location-name" data-user-content>${escape(listing.location)}</p>` : ""}
          ${
            links.preview
              ? ""
              : `<p class="listing-location-note">${text("Location is supplied by the publisher. Verify it independently.")}</p>
          ${listing.latitude !== null && listing.longitude !== null ? `<div class="listing-map-frame"><div id="property-map" role="region" aria-label="${text("Map")}"></div></div>` : `<p class="muted">${text("No exact map location supplied.")}</p>`}`
          }
        </section>
        ${
          links.preview
            ? ""
            : `<details class="listing-provenance"><summary>${text("Listing source & authenticity")}</summary><dl class="property-specifications">
          <div><dt>${text("Listing identifier")}</dt><dd data-user-content>${escape(listing.identifier)}</dd></div>
          <div><dt>${text("Publisher public key")}</dt><dd class="listing-source-key" data-user-content>${escape(npub)}</dd></div>
          <div><dt>${text("Event ID")}</dt><dd class="listing-source-key" data-user-content>${escape(listing.id)}</dd></div>
        </dl><p>${text("A signed event proves control of a key, not ownership of the property. Verify the property and publisher independently.")}</p></details>`
        }
      </div>
      <aside class="publisher-card" aria-label="${text(links.preview ? "Nostr publisher" : "Published by")}">
        <p class="publisher-eyebrow">${text(links.preview ? "Nostr publisher" : "Published by")}</p>
        <div class="publisher-identity"><div class="publisher-avatar"><span data-user-content>${escape(monogram)}</span>${avatar ? `<img src="${escape(avatar)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-publisher-avatar>` : ""}</div><div class="publisher-name"><h2${name ? " data-user-content" : ""}>${name ? escape(name) : text("Nostr publisher")}</h2><p data-user-content title="${escape(npub)}">${escape(shortNpub)}</p></div></div>
        <a class="button publisher-profile-link" href="${escape(links.profile)}">${text("View publisher profile")} <span aria-hidden="true">&rarr;</span></a>
        ${links.preview ? "" : `<button type="button" class="button-secondary publisher-copy" id="copy-npub">${text("Copy npub")}</button>`}
        ${website ? `<a class="publisher-website" href="${escape(website)}" target="_blank" rel="noopener noreferrer">${text("Visit website")} <span aria-hidden="true">&nearr;</span></a>` : ""}
        ${links.preview ? "" : `<p class="publisher-disclaimer">${text("A signed event proves control of a key, not ownership of the property. Verify the property and publisher independently.")}</p>`}
      </aside>
    </div>
    ${
      images.length
        ? `<dialog id="property-gallery-dialog" class="property-gallery-dialog" aria-label="${text("Property photos")}">
      <div class="gallery-dialog-toolbar"><p data-gallery-count aria-live="polite"></p><button type="button" data-gallery-close autofocus>${text("Close photos")} <span aria-hidden="true">&times;</span></button></div>
      <div class="gallery-dialog-stage"><img data-gallery-image alt="${escape(listing.title)}" data-user-content referrerpolicy="no-referrer"><p data-gallery-error hidden>${text("Photo unavailable")}</p></div>
      <div class="gallery-dialog-controls"><button type="button" data-gallery-previous aria-label="${text("Previous photo")}"><span aria-hidden="true">&larr;</span> ${text("Previous photo")}</button><button type="button" data-gallery-next aria-label="${text("Next photo")}">${text("Next photo")} <span aria-hidden="true">&rarr;</span></button></div>
    </dialog>`
        : ""
    }
  </article>`;
}

const boundElements = new WeakSet<HTMLElement>();

export function bindListingGallery(root: HTMLElement): void {
  const failed = new Set<string>();
  root
    .querySelectorAll<HTMLImageElement>(
      ".property-gallery-photo img, [data-publisher-avatar]",
    )
    .forEach((image) => {
      if (boundElements.has(image)) return;
      boundElements.add(image);
      const onError = () => {
        failed.add(image.src);
        image.hidden = true;
        const fallback = image.parentElement?.querySelector<HTMLElement>(
          ".gallery-image-fallback",
        );
        if (fallback) fallback.hidden = false;
      };
      image.addEventListener("error", onError, { once: true });
      if (image.complete && !image.naturalWidth) onError();
    });
  const dialog = root.querySelector<HTMLDialogElement>(
    "#property-gallery-dialog",
  );
  if (
    !dialog ||
    typeof dialog.showModal !== "function" ||
    boundElements.has(dialog)
  )
    return;
  boundElements.add(dialog);
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-gallery-index]"),
  ];
  const sources = buttons.map(
    (button) => button.querySelector<HTMLImageElement>("img")?.src ?? "",
  );
  const image = dialog.querySelector<HTMLImageElement>("[data-gallery-image]");
  const error = dialog.querySelector<HTMLElement>("[data-gallery-error]");
  const count = dialog.querySelector<HTMLElement>("[data-gallery-count]");
  if (!image || !error || !count || !sources.length) return;
  let current = 0;
  let previousOverflow: string | null = null;
  const show = (index: number) => {
    current = (index + sources.length) % sources.length;
    count.textContent = photoLabel(current + 1, sources.length);
    image.hidden = failed.has(sources[current]);
    error.hidden = !image.hidden;
    if (image.hidden) image.removeAttribute("src");
    else if (image.getAttribute("src") !== sources[current])
      image.src = sources[current];
  };
  image.addEventListener("error", () => {
    failed.add(image.src);
    image.hidden = true;
    error.hidden = false;
    image.removeAttribute("src");
  });
  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      show(index);
      if (!dialog.open) {
        dialog.showModal();
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
    });
  });
  dialog
    .querySelector("[data-gallery-close]")
    ?.addEventListener("click", () => dialog.close());
  dialog
    .querySelector("[data-gallery-previous]")
    ?.addEventListener("click", () => show(current - 1));
  dialog
    .querySelector("[data-gallery-next]")
    ?.addEventListener("click", () => show(current + 1));
  dialog
    .querySelectorAll<HTMLButtonElement>(
      "[data-gallery-previous], [data-gallery-next]",
    )
    .forEach((button) => {
      button.disabled = sources.length < 2;
    });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(current + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  dialog.addEventListener("close", () => {
    if (previousOverflow !== null)
      document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  });
}
