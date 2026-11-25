import { t } from "./i18n";

let membershipView: HTMLElement | undefined;
let previewView: HTMLElement | undefined;

export function createEmailView(preview: boolean): HTMLElement {
  // Move the original node: Ghost binds its form listeners at page initialization.
  membershipView ??=
    document.getElementById("ghost-dashboard-membership") ?? undefined;
  if (membershipView) {
    membershipView.hidden = false;
    return membershipView;
  }

  if (!previewView) {
    previewView = document.createElement("section");
    previewView.className = "panel newsletter-account client-view";
    previewView.dataset.membershipState = preview ? "preview" : "unavailable";
    previewView.setAttribute("aria-labelledby", "dashboard-newsletter-title");
    previewView.innerHTML = `
      <p class="eyebrow" data-i18n="Newsletter"></p>
      <h2 id="dashboard-newsletter-title" data-i18n="Newsletter & membership"></h2>
      <p data-i18n="Stay in the loop."></p>
      <p data-i18n="Property stories, ideas for your next move and what is new at Vastgoed, delivered by email."></p>
      <p class="notice" data-i18n="Newsletter signup is only available on the live Vastgoed site."></p>
      <form class="newsletter-form" data-dashboard-preview-newsletter>
        <label for="dashboard-newsletter-email" data-i18n="Email address"></label>
        <div class="newsletter-fields">
          <input id="dashboard-newsletter-email" name="email" type="email" required autocomplete="email" aria-describedby="dashboard-newsletter-consent">
          <button class="button newsletter-submit" type="submit" data-i18n="Sign up for the newsletter"></button>
        </div>
        <p class="newsletter-consent muted" id="dashboard-newsletter-consent" data-i18n="By signing up, you agree to receive emails from Vastgoed. Unsubscribe at any time using the link in each email."></p>
        <p class="notice" data-preview-newsletter-status role="status" hidden></p>
      </form>
      <div class="newsletter-identity-note muted">
        <p data-i18n="Your membership is separate from your Nostr identity."></p>
        <p data-i18n="Email signup does not give permission to edit Nostr listings."></p>
      </div>`;
    previewView.querySelector("form")!.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = previewView!.querySelector<HTMLElement>(
        "[data-preview-newsletter-status]",
      )!;
      status.dataset.i18n =
        "No signup was sent. Open the live Vastgoed site to subscribe.";
      status.textContent = t(status.dataset.i18n);
      status.hidden = false;
    });
  }

  for (const node of previewView.querySelectorAll<HTMLElement>("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n!);
  }
  return previewView;
}
