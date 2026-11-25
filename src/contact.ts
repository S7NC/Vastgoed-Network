import { translate } from "./i18n";

export function renderContact(root: HTMLElement): void {
  root.className = "page-shell contact-page";
  root.setAttribute("aria-label", "Contact");
  root.innerHTML = `<section class="contact-panel" aria-labelledby="contact-title">
    <p class="eyebrow">Contact</p>
    <h1 id="contact-title">Let's connect.</h1>
    <p class="contact-description">Have a question, an idea, or want to work together? Email us and we will take it from there.</p>
    <a class="contact-email" href="mailto:info@vastgoed.org" aria-label="Email Vastgoed"><span data-user-content>info@vastgoed.org</span><span aria-hidden="true">&#8599;</span></a>
    <a class="text-link" href="/">Back to property search</a>
  </section>`;
  document
    .querySelector<HTMLElement>(".publish-section")
    ?.setAttribute("hidden", "");
  translate(root);
}
