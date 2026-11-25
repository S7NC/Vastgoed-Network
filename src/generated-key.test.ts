import { describe, expect, it } from "vitest";
import {
  finalizeEvent,
  getEventHash,
  getPublicKey,
  nip19,
  verifyEvent,
  type Event,
  type EventTemplate,
} from "nostr-tools";
import { generateBrowserKey } from "./generated-key";

function template(): EventTemplate {
  return {
    kind: 30402,
    created_at: 1730000000,
    content: "A home in Amsterdam",
    tags: [
      ["d", "home"],
      ["title", "Canal apartment"],
    ],
  };
}

describe("generateBrowserKey", () => {
  it("signs valid events with the advertised public key and correct hash", async () => {
    const key = generateBrowserKey();
    const event: Event = JSON.parse(JSON.stringify(await key.sign(template())));

    expect(key.pubkey).toMatch(/^[0-9a-f]{64}$/);
    expect(event.pubkey).toBe(key.pubkey);
    expect(event.id).toBe(getEventHash(event));
    expect(verifyEvent(event)).toBe(true);
    key.destroy();
  });

  it("backs up matching npub and nsec keys that recover signing access", async () => {
    const key = generateBrowserKey();
    const backup = key.backup();
    expect(backup).toContain("Vastgoed.net");
    expect(backup).toContain(
      "WARNING: This plaintext document contains your private key.",
    );
    expect(backup).toContain("trusted Nostr signer to manage future listings");
    expect(backup).toContain("private and offline");
    expect(backup).toContain("no membership account recovery");

    const publicKey = nip19.decode(backup.match(/npub1[a-z0-9]+/)![0]);
    const privateKey = nip19.decode(backup.match(/nsec1[a-z0-9]+/)![0]);
    expect(publicKey.type).toBe("npub");
    expect(publicKey.data).toBe(key.pubkey);
    if (privateKey.type !== "nsec") throw new Error("Expected nsec backup");
    expect(getPublicKey(privateKey.data)).toBe(key.pubkey);

    const original = await key.sign(template());
    key.destroy();
    const recovered: Event = JSON.parse(
      JSON.stringify(finalizeEvent(template(), privateKey.data)),
    );
    expect(recovered.pubkey).toBe(original.pubkey);
    expect(recovered.id).toBe(original.id);
    expect(recovered.id).toBe(getEventHash(recovered));
    expect(verifyEvent(recovered)).toBe(true);
    privateKey.data.fill(0);
  });

  it("generates independent keys", async () => {
    const first = generateBrowserKey();
    const second = generateBrowserKey();
    expect(first.pubkey).not.toBe(second.pubkey);
    expect(first.backup()).not.toBe(second.backup());
    expect((await first.sign(template())).id).not.toBe(
      (await second.sign(template())).id,
    );
    first.destroy();
    expect(
      verifyEvent(JSON.parse(JSON.stringify(await second.sign(template())))),
    ).toBe(true);
    second.destroy();
  });

  it("keeps secrets out of the API object and public events", async () => {
    const key = generateBrowserKey();
    const nsec = key.backup().match(/nsec1[a-z0-9]+/)![0];
    const decoded = nip19.decode(nsec);
    if (decoded.type !== "nsec") throw new Error("Expected nsec backup");
    const hex = Array.from(decoded.data, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const event = await key.sign({
      ...template(),
      secret: "must not be copied",
    } as EventTemplate);

    expect(Object.keys(key).sort()).toEqual([
      "backup",
      "destroy",
      "pubkey",
      "sign",
    ]);
    expect(JSON.parse(JSON.stringify(key))).toEqual({ pubkey: key.pubkey });
    expect(Object.keys(event).sort()).toEqual([
      "content",
      "created_at",
      "id",
      "kind",
      "pubkey",
      "sig",
      "tags",
    ]);
    for (const serialized of [JSON.stringify(key), JSON.stringify(event)]) {
      expect(serialized).not.toContain(nsec);
      expect(serialized).not.toContain(hex);
      expect(serialized).not.toContain(
        JSON.stringify(Array.from(decoded.data)),
      );
      expect(serialized).not.toContain("must not be copied");
    }
    decoded.data.fill(0);
    key.destroy();
  });

  it("does not mutate or share tag arrays with the caller's template", async () => {
    const key = generateBrowserKey();
    const input = template();
    const before = structuredClone(input);
    input.tags.forEach(Object.freeze);
    Object.freeze(input.tags);
    Object.freeze(input);

    const event = await key.sign(input);
    expect(input).toEqual(before);
    expect(event).not.toBe(input);
    expect(event.tags).not.toBe(input.tags);
    event.tags.forEach((tag, index) => expect(tag).not.toBe(input.tags[index]));
    event.tags[0][1] = "changed";
    event.tags.push(["extra"]);
    expect(input).toEqual(before);
    key.destroy();
  });

  it("disables signing and backups after destruction but preserves the public key", async () => {
    const key = generateBrowserKey();
    const pubkey = key.pubkey;
    const event = await key.sign(template());
    key.destroy();
    key.destroy();

    expect(key.pubkey).toBe(pubkey);
    expect(() => key.backup()).toThrow("Generated key has been destroyed.");
    await expect(key.sign(template())).rejects.toThrow(
      "Generated key has been destroyed.",
    );
    expect(verifyEvent(JSON.parse(JSON.stringify(event)))).toBe(true);
  });
});
