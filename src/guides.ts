import { translate } from "./i18n";

/** Local preview only; Ghost renders its own guides collection template. */
export function renderGuides(root: HTMLElement): void {
  const newsletter = document.querySelector<HTMLElement>("#newsletter");
  root.classList.remove("property-search");
  root.classList.add("guides-page", "how-it-works");
  root.setAttribute("aria-label", "How Vastgoed works");
  root.innerHTML = `
    <header class="page-heading guides-heading">
      <p class="eyebrow">An open property network</p>
      <h1>How Vastgoed works</h1>
      <p class="muted">Find a place in Europe. Share your property for free. Keep control of your publishing identity.</p>
      <div class="actions"><a class="button" href="/dashboard/#editor">Publish for free</a><a class="text-link" href="/">Explore properties</a></div>
    </header>
    <ol class="how-steps" aria-label="Getting started">
      <li><span class="eyebrow">01 / Explore</span><h2>Find your next place</h2><p>Browse properties across Europe, refine your search and explore the map. You do not need an account to browse. Contact publishers using the details they choose to share.</p></li>
      <li><span class="eyebrow">02 / Create</span><h2>Start with your property</h2><p>Open the composer and add your property details without an email signup. Stage photographs locally while you prepare your listing. Local previews are not published or backed up to the network.</p></li>
      <li><span class="eyebrow">03 / Publish</span><h2>Your listing. Your keys.</h2><p>Choose a compatible Nostr browser extension or generate a new key pair. Generated keys stay in memory only. Download and confirm your plaintext private key backup before public photo uploads or signing. Vastgoed cannot recover a lost key.</p></li>
    </ol>
    <section class="how-network" aria-labelledby="how-network-title"><p class="eyebrow">Built on Nostr</p><h2 id="how-network-title">An open network, not a locked account</h2><p>Your key signs your listings; relays distribute them. Keep the same identity to manage your published properties. Relay availability and media hosting depend on the services you choose, and external fees may apply.</p><a class="text-link" href="/dashboard/#listings">My listings</a></section>
    <section class="how-faq" aria-labelledby="how-faq-title"><h2 id="how-faq-title">Before you publish</h2>
      <details><summary>Do I need an email account to publish?</summary><p>No. Publishing uses a Nostr identity, not an email membership. The email list is optional and cannot sign or manage your listings.</p></details>
      <details><summary>Who controls my listings?</summary><p>The publishing key is your authority to sign updates. Protect it and keep a secure backup. Vastgoed cannot recover a lost private key, and removing a listing does not guarantee that every relay or third party removes its copies.</p></details>
      <details><summary>What happens to my photographs?</summary><p>Staging a photograph locally is not the same as uploading it. Published media is public. Review photographs for visible personal information before uploading to your chosen media host.</p></details>
      <details><summary>How can I receive the Vastgoed edit?</summary><p>Subscribe to the optional email list on the live Vastgoed site. Local preview does not create a subscription. Your membership is separate from your Nostr identity.</p><a class="text-link" href="/guides/#newsletter">Email list</a></details>
    </section>`;
  if (newsletter) {
    root.append(newsletter);
    newsletter.hidden = false;
    if (location.hash === "#newsletter")
      requestAnimationFrame(() => newsletter.scrollIntoView());
  }
  const publishing = document.querySelector<HTMLElement>(".publish-section");
  if (publishing) publishing.hidden = true;
  translate(root);
}
