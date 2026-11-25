import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19,
  type Event,
  type EventTemplate,
} from "nostr-tools";

export interface GeneratedKey {
  pubkey: string;
  sign(template: EventTemplate): Promise<Event>;
  backup(): string;
  destroy(): void;
}

export function generateBrowserKey(): GeneratedKey {
  const secret = generateSecretKey();
  const pubkey = getPublicKey(secret);
  let destroyed = false;

  function assertActive(): void {
    if (destroyed) throw new Error("Generated key has been destroyed.");
  }

  return {
    pubkey,
    async sign(template) {
      assertActive();
      return finalizeEvent(
        {
          kind: template.kind,
          created_at: template.created_at,
          content: template.content,
          tags: template.tags.map((tag) => [...tag]),
        },
        secret,
      );
    },
    backup() {
      assertActive();
      return [
        "Vastgoed.net Nostr Key Backup",
        "",
        `Public key (npub): ${nip19.npubEncode(pubkey)}`,
        `Private key (nsec): ${nip19.nsecEncode(secret)}`,
        "",
        "WARNING: This plaintext document contains your private key.",
        "Import this private key into a trusted Nostr signer to manage future listings.",
        "Keep this backup private and offline. Anyone with this key can act as you.",
        "There is no membership account recovery for this key. Losing it means losing control of your listings.",
        "",
      ].join("\n");
    },
    destroy() {
      secret.fill(0);
      destroyed = true;
    },
  };
}
