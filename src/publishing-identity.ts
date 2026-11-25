import { nip19, type Event, type EventTemplate } from "nostr-tools";
import { generateBrowserKey, type GeneratedKey } from "./generated-key";
import { t, translate } from "./i18n";

export function createPublishingIdentity(options: {
  getPubkey: () => string;
  isEditing: () => boolean;
  adopt: (key: string) => void;
  notify: (message: string, error?: boolean) => void;
  changed: () => void;
}): {
  element: HTMLElement;
  signer(
    key: string,
  ): ((template: EventTemplate) => Promise<Event>) | undefined;
  assertReady(key: string): void;
  reset(): void;
  refresh(): void;
} {
  let generated: GeneratedKey | undefined;
  let mode: "extension" | "generated" | "publiclookup" = "publiclookup";
  let downloaded = false;
  let confirmed = false;
  let busy = false;
  let revision = 0;
  let backupUrl: string | undefined;
  let backupTimer: ReturnType<typeof setTimeout> | undefined;
  const element = document.createElement("section");
  element.className = "publishing-identity";
  element.setAttribute("aria-label", "Publishing identity");
  element.innerHTML = `
    <h3 data-i18n="Publishing identity">Publishing identity</h3>
    <p data-i18n="Choose how to sign. No email account is required.">Choose how to sign. No email account is required.</p>
    <p class="publishing-public-key" data-user-content hidden></p>
    <div class="signing-choices">
      <button type="button" id="choose-extension" data-i18n="Use browser extension">Use browser extension</button>
      <button type="button" id="generate-listing-key" data-i18n="Generate a new key pair">Generate a new key pair</button>
    </div>
    <p class="publishing-edit-warning" data-i18n="An existing listing must keep its original publishing identity." hidden>An existing listing must keep its original publishing identity.</p>
    <div class="key-backup-panel" hidden>
      <h4 data-i18n="Back up your publishing key">Back up your publishing key</h4>
      <p class="key-backup-warning" data-i18n="Keep your key private. Vastgoed cannot recover it.">Keep your key private. Vastgoed cannot recover it.</p>
      <p data-i18n="The backup is an unencrypted text file. Keep it offline and never share it.">The backup is an unencrypted text file. Keep it offline and never share it.</p>
      <p data-i18n="The key stays in memory only. Reloading or disconnecting clears it.">The key stays in memory only. Reloading or disconnecting clears it.</p>
      <p data-i18n="To manage listings later, import this backup into a trusted Nostr extension and connect it here.">To manage listings later, import this backup into a trusted Nostr extension and connect it here.</p>
      <button type="button" id="download-key-backup" data-i18n="Download private key backup">Download private key backup</button>
      <label class="key-ack" for="key-backup-confirmed">
        <input type="checkbox" id="key-backup-confirmed" disabled>
        <span data-i18n="I saved my private key backup and understand that losing it means losing control of my listings.">I saved my private key backup and understand that losing it means losing control of my listings.</span>
      </label>
    </div>`;
  const extensionButton =
    element.querySelector<HTMLButtonElement>("#choose-extension")!;
  const generateButton = element.querySelector<HTMLButtonElement>(
    "#generate-listing-key",
  )!;
  const downloadButton = element.querySelector<HTMLButtonElement>(
    "#download-key-backup",
  )!;
  const acknowledgement = element.querySelector<HTMLInputElement>(
    "#key-backup-confirmed",
  )!;
  const publicKey = element.querySelector<HTMLElement>(
    ".publishing-public-key",
  )!;
  const backupPanel = element.querySelector<HTMLElement>(".key-backup-panel")!;
  const editWarning = element.querySelector<HTMLElement>(
    ".publishing-edit-warning",
  )!;

  function revokeBackup(): void {
    if (backupTimer !== undefined) clearTimeout(backupTimer);
    if (backupUrl !== undefined) URL.revokeObjectURL(backupUrl);
    backupTimer = undefined;
    backupUrl = undefined;
  }

  function discardGenerated(): void {
    generated?.destroy();
    generated = undefined;
    downloaded = false;
    confirmed = false;
    revokeBackup();
  }

  function confirmReplacement(): boolean {
    return (
      !generated ||
      window.confirm(
        t(
          "Switching identities clears the generated private key from memory. Save your backup first. Vastgoed cannot recover it. Continue?",
        ),
      )
    );
  }

  function refresh(): void {
    const key = options.getPubkey();
    publicKey.hidden = !key;
    publicKey.textContent = /^[0-9a-f]{64}$/i.test(key)
      ? nip19.npubEncode(key.toLowerCase())
      : "";
    extensionButton.disabled = busy;
    generateButton.disabled = busy || options.isEditing();
    extensionButton.setAttribute("aria-pressed", String(mode === "extension"));
    generateButton.setAttribute("aria-pressed", String(mode === "generated"));
    editWarning.hidden = !options.isEditing();
    backupPanel.hidden = !generated;
    downloadButton.disabled = busy || !generated;
    acknowledgement.disabled = !downloaded || !generated;
    acknowledgement.checked = confirmed;
    translate(element);
  }

  function assertReady(key: string): void {
    if (!key)
      throw new Error(t("Choose a publishing identity before continuing."));
    if (generated) {
      if (key !== generated.pubkey)
        throw new Error(
          t("The publishing identity does not match the generated key."),
        );
      if (!downloaded || !confirmed)
        throw new Error(
          t(
            "Download your private key backup and confirm that you saved it before continuing.",
          ),
        );
    } else if (!window.nostr) {
      throw new Error(
        t(
          "Install a NIP-07 Nostr browser extension to sign with this identity.",
        ),
      );
    }
  }

  extensionButton.addEventListener("click", async () => {
    if (busy) return;
    if (!window.nostr) {
      options.notify(
        t(
          "Install a NIP-07 Nostr browser extension to sign with this identity.",
        ),
        true,
      );
      return;
    }
    busy = true;
    const request = ++revision;
    refresh();
    try {
      let key: string;
      try {
        key = await window.nostr.getPublicKey();
      } catch {
        throw new Error(
          t("Could not connect to the browser extension. Please try again."),
        );
      }
      if (request !== revision) return;
      if (typeof key !== "string" || !/^[0-9a-f]{64}$/i.test(key))
        throw new Error(
          t("The browser extension returned an invalid public key."),
        );
      key = key.toLowerCase();
      if (options.isEditing() && options.getPubkey().toLowerCase() !== key)
        throw new Error(
          t("An existing listing must keep its original publishing identity."),
        );
      if (!confirmReplacement()) return;
      // adopt updates the caller's identity, not its form or this controller.
      options.adopt(key);
      discardGenerated();
      mode = "extension";
      refresh();
      options.changed();
    } catch (error) {
      if (request === revision)
        options.notify(
          error instanceof Error
            ? error.message
            : t(
                "Could not connect to the browser extension. Please try again.",
              ),
          true,
        );
    } finally {
      if (request === revision) {
        busy = false;
        refresh();
      }
    }
  });

  generateButton.addEventListener("click", () => {
    if (busy || options.isEditing() || !confirmReplacement()) return;
    let next: GeneratedKey | undefined;
    try {
      next = generateBrowserKey();
      options.adopt(next.pubkey);
      discardGenerated();
      generated = next;
      next = undefined;
      mode = "generated";
      refresh();
      options.changed();
    } catch {
      next?.destroy();
      options.notify(
        t("Could not generate a publishing key. Please try again."),
        true,
      );
    }
  });

  downloadButton.addEventListener("click", () => {
    if (!generated || busy) return;
    const link = document.createElement("a");
    try {
      revokeBackup();
      backupUrl = URL.createObjectURL(
        new Blob([generated.backup()], { type: "text/plain" }),
      );
      link.href = backupUrl;
      link.download = `vastgoed-key-${generated.pubkey.slice(0, 12)}.txt`;
      link.hidden = true;
      element.append(link);
      link.click();
      backupTimer = setTimeout(revokeBackup, 10_000);
      downloaded = true;
      refresh();
      options.changed();
    } catch {
      revokeBackup();
      options.notify(
        t("Could not download your key backup. Please try again."),
        true,
      );
    } finally {
      link.remove();
    }
  });

  acknowledgement.addEventListener("change", () => {
    confirmed = !!generated && downloaded && acknowledgement.checked;
    refresh();
    options.changed();
  });

  refresh();
  return {
    element,
    signer(key) {
      if (!generated || generated.pubkey !== key) return undefined;
      const signingKey = generated;
      return async (template) => {
        assertReady(key);
        if (generated !== signingKey)
          throw new Error(
            t("The publishing identity has changed. Please try again."),
          );
        return signingKey.sign(template);
      };
    },
    assertReady,
    reset() {
      ++revision;
      busy = false;
      discardGenerated();
      mode = "publiclookup";
      refresh();
    },
    refresh,
  };
}
