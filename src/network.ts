import {
  SimplePool,
  verifyEvent,
  type Event,
  type EventTemplate,
  type Filter,
} from "nostr-tools";
import { DISCOVERY_TAGS } from "./model";

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: EventTemplate): Promise<Event>;
    };
  }
}

export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
];
export const DEFAULT_BLOSSOM = "https://blossom.primal.net";
export const pool = new SimplePool();
export const PAGE_SIZE = 150;

export function relayUrls(text: string): string[] {
  const urls = [
    ...new Set(
      text
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((value) => {
          const url = new URL(value);
          if (
            url.protocol !== "wss:" ||
            url.username ||
            url.password ||
            url.hash
          )
            throw new Error(
              "Relays must use secure wss:// URLs without credentials or fragments.",
            );
          return url.href.replace(/\/$/, "");
        }),
    ),
  ];
  if (!urls.length || urls.length > 8)
    throw new Error("Choose between one and eight relays.");
  return urls;
}

export async function query(
  relays: string[],
  filter: Filter,
): Promise<Event[]> {
  return pool.querySync(relays, filter, { maxWait: 9000 });
}

export async function discover(
  relays: string[],
  until: number,
): Promise<{ events: Event[]; reports: string[] }> {
  const results = await Promise.allSettled(
    relays.map(async (relay) => {
      const events = await query([relay], {
        kinds: [30402],
        "#t": DISCOVERY_TAGS,
        until,
        limit: PAGE_SIZE,
      });
      return { relay, events };
    }),
  );
  const events: Event[] = [];
  const reports = results.map((result, i) => {
    if (result.status === "rejected")
      return `${new URL(relays[i]).host}: request failed`;
    events.push(...result.value.events);
    return `${new URL(relays[i]).host}: ${result.value.events.length} events returned`;
  });
  // Follow addresses without the discovery tag filter so changed classifications and
  // inactive updates cannot leave an older tagged version in public results.
  const addresses = new Map<string, string[]>();
  for (const event of events) {
    const d = event.tags.find((t) => t[0] === "d")?.[1];
    if (d)
      addresses.set(event.pubkey, [
        ...new Set([...(addresses.get(event.pubkey) ?? []), d]),
      ]);
  }
  const entries = [...addresses].slice(0, 80);
  for (let i = 0; i < entries.length; i += 8) {
    await Promise.all(
      entries.slice(i, i + 8).map(async ([author, identifiers]) => {
        const updates = await query(relays, {
          kinds: [30402],
          authors: [author],
          "#d": identifiers,
          limit: 200,
        });
        events.push(...updates);
      }),
    );
  }
  return { events, reports };
}

export async function sign(
  template: EventTemplate,
  pubkey: string,
  signer?: (template: EventTemplate) => Promise<Event>,
): Promise<Event> {
  if (!signer && !window.nostr)
    throw new Error("Install a NIP-07 browser extension to sign.");
  const event = signer
    ? await signer(template)
    : await window.nostr!.signEvent(template);
  if (
    event.pubkey !== pubkey ||
    event.kind !== template.kind ||
    event.created_at !== template.created_at ||
    event.content !== template.content ||
    JSON.stringify(event.tags) !== JSON.stringify(template.tags) ||
    !verifyEvent(event)
  )
    throw new Error(
      "The extension returned an unexpected or invalid signed event.",
    );
  return event;
}

export async function publish(event: Event, relays: string[]): Promise<string> {
  const results = await Promise.allSettled(
    pool.publish(relays, event, { maxWait: 10000 }),
  );
  const accepted = results.flatMap((result, i) =>
    result.status === "fulfilled" ? [relays[i]] : [],
  );
  if (!accepted.length)
    throw new Error(
      "No relay acknowledged this event. Keep this page open and retry the signed event.",
    );
  return `${accepted.length}/${relays.length} relays acknowledged. ${accepted.join(", ")}`;
}

export async function uploadImage(
  file: File,
  server: string,
  pubkey: string,
  signer?: (template: EventTemplate) => Promise<Event>,
): Promise<string> {
  const base = new URL(server);
  if (base.protocol !== "https:" || base.username || base.password)
    throw new Error("Blossom must use HTTPS without credentials.");
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  ) {
    throw new Error("Choose a JPEG, PNG, or WebP image below 20 MB.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Re-encoding strips EXIF, including embedded GPS coordinates.
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Cannot process image.")),
      "image/webp",
      0.85,
    ),
  );
  const hash = [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const now = Math.floor(Date.now() / 1000);
  const auth = await sign(
    {
      kind: 24242,
      created_at: now,
      content: "Upload property image",
      tags: [
        ["t", "upload"],
        ["x", hash],
        ["expiration", String(now + 300)],
      ],
    },
    pubkey,
    signer,
  );
  const encoded = btoa(JSON.stringify(auth));
  const response = await fetch(new URL("/upload", base), {
    method: "PUT",
    headers: { Authorization: `Nostr ${encoded}`, "Content-Type": blob.type },
    body: blob,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `Blossom upload failed (${response.status}). Check provider access, CORS, or quota.`,
    );
  const descriptor = await response.json();
  if (
    descriptor.sha256 !== hash ||
    typeof descriptor.url !== "string" ||
    !descriptor.url.startsWith("https://")
  )
    throw new Error("Blossom returned an invalid image descriptor.");
  return descriptor.url;
}
