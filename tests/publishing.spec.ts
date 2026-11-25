import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  finalizeEvent,
  getPublicKey,
  matchFilter,
  nip19,
  verifyEvent,
  type Event,
  type EventTemplate,
  type Filter,
} from "nostr-tools";

const origin = "http://127.0.0.1:5173";
const media = "https://blossom.primal.net/upload";

async function network(page: Page) {
  const events = new Map<string, Event>();
  const uploads: { auth: Event; hash: string; url: string }[] = [];
  const wire: string[] = [];
  const writes: { url: string; method: string; body: Buffer | null }[] = [];
  const order: string[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    wire.push(request.url(), JSON.stringify(request.headers()));
    if (!["GET", "HEAD"].includes(request.method())) {
      writes.push({
        url: request.url(),
        method: request.method(),
        body: request.postDataBuffer(),
      });
      wire.push(request.postDataBuffer()?.toString("latin1") ?? "");
    }
    if (request.url() === media) {
      const body = request.postDataBuffer()!;
      const hash = createHash("sha256").update(body).digest("hex");
      const auth = JSON.parse(
        Buffer.from(
          request.headers().authorization.replace(/^Nostr /, ""),
          "base64",
        ).toString(),
      ) as Event;
      expect(verifyEvent(auth)).toBe(true);
      expect(auth.kind).toBe(24242);
      expect(auth.tags).toContainEqual(["x", hash]);
      expect(auth.tags).toContainEqual(["t", "upload"]);
      expect(request.headers()["content-type"]).toBe("image/webp");
      const url = `https://blossom.primal.net/${hash}.webp`;
      uploads.push({ auth, hash, url });
      order.push("upload");
      return route.fulfill({
        status: 201,
        json: {
          sha256: hash,
          url,
          type: "image/webp",
          size: body.length,
          uploaded: 1700000000,
        },
      });
    }
    if (new URL(request.url()).origin === origin) return route.continue();
    return route.abort();
  });
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    socket.onMessage((raw) => {
      wire.push(String(raw));
      const [type, value, ...filters] = JSON.parse(String(raw));
      if (type === "REQ") {
        const sent = new Set<string>();
        for (const filter of filters as Filter[]) {
          for (const event of events.values()) {
            if (!sent.has(event.id) && matchFilter(filter, event)) {
              socket.send(JSON.stringify(["EVENT", value, event]));
              sent.add(event.id);
            }
          }
        }
        socket.send(JSON.stringify(["EOSE", value]));
      } else if (type === "EVENT") {
        const event = value as Event;
        const valid = verifyEvent(event);
        expect(valid).toBe(true);
        if (valid) events.set(event.id, event);
        order.push(`event:${event.kind}`);
        socket.send(
          JSON.stringify([
            "OK",
            event.id,
            valid,
            valid ? "" : "invalid signature",
          ]),
        );
      }
    });
  });
  return { events, uploads, wire, writes, order };
}

async function extension(
  page: Page,
  secret: Uint8Array = new Uint8Array(32).fill(23),
) {
  const pubkey = getPublicKey(secret);
  await page.exposeFunction("testSign", (template: EventTemplate) =>
    finalizeEvent(template, secret),
  );
  await page.evaluate((key) => {
    Reflect.set(window, "nostr", {
      getPublicKey: async () => key,
      signEvent: (template: EventTemplate) =>
        Reflect.get(window, "testSign")(template),
    });
  }, pubkey);
  return pubkey;
}

async function fillGuest(page: Page) {
  await page.goto("/dashboard/#editor");
  await expect(page.locator("#listing-form")).toBeVisible();
  await expect(page.locator("#npub-login")).toBeHidden();
  await page.locator('#listing-form [name="title"]').fill("Guest canal home");
  await page
    .locator('#listing-form [name="location"]')
    .fill("Utrecht, Netherlands");
  await page
    .locator('#listing-form [name="description"]')
    .fill("A public property description without private account data.");
  await page
    .locator('#listing-form [name="summary"]')
    .fill("Locally composed summary");
}

async function photos(page: Page) {
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 24;
    canvas.getContext("2d")!.fillRect(0, 0, 24, 24);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#image-upload").setInputFiles([
    {
      name: "front.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    },
    {
      name: "garden.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    },
  ]);
  await expect(page.locator("#composer-photo-queue img")).toHaveCount(2);
  await expect(page.locator("#composer-photo-queue")).toContainText(
    "Local photo, not uploaded",
  );
}

async function backup(page: Page) {
  const pending = page.waitForEvent("download");
  await page.locator("#download-key-backup").click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^vastgoed-key-[a-f0-9]+\.txt$/);
  const path = await download.path();
  expect(path).not.toBeNull();
  const plaintext = await readFile(path!, "utf8");
  expect(plaintext).toContain("no membership account recovery");
  expect(plaintext).not.toMatch(/ghost/i);
  const nsec = plaintext.match(/nsec1[a-z0-9]+/)![0];
  const npub = plaintext.match(/npub1[a-z0-9]+/)![0];
  const decoded = nip19.decode(nsec);
  if (decoded.type !== "nsec")
    throw new Error("Backup must contain a private key");
  const pubkey = getPublicKey(decoded.data);
  expect(npub).toBe(nip19.npubEncode(pubkey));
  expect(plaintext).toContain("plaintext");
  return { nsec, npub, pubkey, secret: decoded.data };
}

async function privateState(page: Page) {
  return page.evaluate(async () => {
    const values: unknown[] = [];
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)!;
        values.push([key, storage.getItem(key)]);
      }
    }
    let blobs = 0;
    const visit = (value: unknown): unknown => {
      if (value instanceof Blob) {
        blobs++;
        return { blob: value.size, type: value.type };
      }
      if (value instanceof ArrayBuffer)
        return Array.from(new Uint8Array(value));
      if (ArrayBuffer.isView(value))
        return Array.from(
          new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
        );
      if (Array.isArray(value)) return value.map(visit);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [key, visit(entry)]),
        );
      return value;
    };
    for (const info of await indexedDB.databases()) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const data = await new Promise<unknown[]>((resolve, reject) => {
          const request = db.transaction(store).objectStore(store).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        values.push(visit(data));
      }
      db.close();
    }
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        "input, textarea",
      ),
    ).map((input) => input.value);
    return {
      storage: JSON.stringify(values),
      dom: document.documentElement.outerHTML + JSON.stringify(inputs),
      blobs,
    };
  });
}

async function noSecretLeak(
  page: Page,
  mock: Awaited<ReturnType<typeof network>>,
  key: Awaited<ReturnType<typeof backup>>,
) {
  const state = await privateState(page);
  const surfaces =
    state.storage +
    state.dom +
    mock.wire.join("\n") +
    JSON.stringify(mock.uploads);
  expect(surfaces).not.toContain(key.nsec);
  expect(surfaces).not.toContain(Buffer.from(key.secret).toString("hex"));
  expect(surfaces).not.toContain(Array.from(key.secret).join(","));
  expect(mock.writes.every((request) => request.url === media)).toBe(true);
  for (const request of mock.writes) {
    expect(request.body?.includes(Buffer.from(key.secret))).toBe(false);
  }
  expect(mock.wire.join("\n")).not.toContain("private-newsletter@example.com");
  return state;
}

test("guest CSPRNG key requires downloaded backup and acknowledgement, then uploads and signs stable NIP-99 edits", async ({
  page,
}) => {
  const mock = await network(page);
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    Reflect.set(window, "__testRandomCalls", 0);
    crypto.getRandomValues = function <T extends ArrayBufferView>(array: T): T {
      if (array.byteLength >= 32)
        Reflect.set(
          window,
          "__testRandomCalls",
          Reflect.get(window, "__testRandomCalls") + 1,
        );
      return random(array);
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fillGuest(page);
  await page.locator('[data-client-nav="email"]').click();
  await page
    .locator('[data-dashboard-preview-newsletter] input[type="email"]')
    .fill("private-newsletter@example.com");
  await page.locator('[data-client-nav="editor"]').click();
  expect(
    await page.evaluate(() => Reflect.get(window, "nostr")),
  ).toBeUndefined();
  await photos(page);
  await expect(page.locator("#upload-queued-photos")).toBeDisabled();
  expect(mock.uploads).toHaveLength(0);
  const randomCalls = await page.evaluate(() =>
    Reflect.get(window, "__testRandomCalls"),
  );
  await page.locator("#generate-listing-key").click();
  expect(
    await page.evaluate(() => Reflect.get(window, "__testRandomCalls")),
  ).toBeGreaterThan(randomCalls);
  await expect(page.locator("#key-backup-confirmed")).toBeDisabled();
  await page.locator("#publish-listing").click();
  await expect(page.locator("#app-message")).toContainText(
    "Download your private key backup and confirm",
  );
  expect(mock.events.size).toBe(0);
  expect(mock.uploads).toHaveLength(0);
  const key = await backup(page);
  await expect(page.locator(".publishing-public-key")).toHaveText(key.npub);
  await page.locator("#publish-listing").click();
  await expect(page.locator("#app-message")).toContainText(
    "Download your private key backup and confirm",
  );
  await expect(page.locator("#upload-queued-photos")).toBeDisabled();
  expect(mock.events.size).toBe(0);
  expect(mock.uploads).toHaveLength(0);
  await noSecretLeak(page, mock, key);
  await page.locator("#key-backup-confirmed").check();
  await expect(page.locator("#upload-queued-photos")).toBeEnabled();
  await page.locator("#publish-listing").click();
  await expect(page.locator("#app-message")).toContainText(
    "3/3 relays acknowledged",
  );
  expect(mock.uploads).toHaveLength(2);
  expect(
    mock.uploads.every((upload) => upload.auth.pubkey === key.pubkey),
  ).toBe(true);
  expect(mock.order.slice(0, 2)).toEqual(["upload", "upload"]);
  expect(mock.events.size).toBe(1);
  const original = [...mock.events.values()][0];
  expect(original.kind).toBe(30402);
  expect(original.pubkey).toBe(key.pubkey);
  expect(verifyEvent(original)).toBe(true);
  expect(original.tags).toContainEqual(["t", "real-estate"]);
  for (const upload of mock.uploads)
    expect(original.tags).toContainEqual(["image", upload.url]);
  const identifier = original.tags.find((tag) => tag[0] === "d");
  expect(identifier?.[1]).toBeTruthy();
  await expect(page.locator("#generate-listing-key")).toBeDisabled();
  await page.locator('#listing-form [name="title"]').fill("Updated guest home");
  await page.locator("#publish-listing").click();
  await expect.poll(() => mock.events.size).toBe(2);
  const updated = [...mock.events.values()][1];
  expect(updated.pubkey).toBe(key.pubkey);
  expect(updated.tags).toContainEqual(identifier);
  expect(updated.tags).toContainEqual(["title", "Updated guest home"]);
  expect(verifyEvent(updated)).toBe(true);
  expect(mock.uploads).toHaveLength(2);
  await noSecretLeak(page, mock, key);
  expect(errors).toEqual([]);
});

test("explicit queued upload uses the generated signer only after backup acknowledgement and does not publish", async ({
  page,
}) => {
  const mock = await network(page);
  await fillGuest(page);
  await photos(page);
  await page.locator("#generate-listing-key").click();
  const key = await backup(page);
  await expect(page.locator("#upload-queued-photos")).toBeDisabled();
  expect(mock.uploads).toHaveLength(0);
  await page.locator("#key-backup-confirmed").check();
  await page.locator("#upload-queued-photos").click();
  await expect(page.locator("#app-message")).toContainText(
    "Photograph uploaded",
  );
  expect(mock.uploads).toHaveLength(2);
  expect(
    mock.uploads.every((upload) => upload.auth.pubkey === key.pubkey),
  ).toBe(true);
  expect(mock.events.size).toBe(0);
  await expect(page.locator("#upload-queued-photos")).toBeDisabled();
  await expect(page.locator("#composer-photo-queue")).not.toContainText(
    "Local photo, not uploaded",
  );
  await noSecretLeak(page, mock, key);
});

test("choosing an extension preserves guest fields and queued photos; publish uploads pending photos", async ({
  page,
}) => {
  const mock = await network(page);
  await fillGuest(page);
  await photos(page);
  const pubkey = await extension(page);
  await page.locator("#choose-extension").click();
  await expect(page.locator(".publishing-public-key")).toHaveText(
    nip19.npubEncode(pubkey),
  );
  await expect(page.locator('#listing-form [name="title"]')).toHaveValue(
    "Guest canal home",
  );
  await expect(page.locator('#listing-form [name="location"]')).toHaveValue(
    "Utrecht, Netherlands",
  );
  await expect(page.locator('#listing-form [name="summary"]')).toHaveValue(
    "Locally composed summary",
  );
  await expect(page.locator("#composer-photo-queue img")).toHaveCount(2);
  expect(mock.uploads).toHaveLength(0);
  await page.locator("#publish-listing").click();
  await expect.poll(() => mock.events.size).toBe(1);
  expect(mock.uploads).toHaveLength(2);
  expect([...mock.events.values()][0].pubkey).toBe(pubkey);
  expect([...mock.events.values()][0].content).toBe(
    "A public property description without private account data.",
  );
  await expect(page.locator("#generate-listing-key")).toBeDisabled();
});

test("guest local drafts restore actual Blob photos after reload, without persisting the generated private key", async ({
  page,
}) => {
  const mock = await network(page);
  await fillGuest(page);
  await photos(page);
  await page.locator("#save-draft").click();
  await expect(page.locator("#app-message")).toContainText("Draft saved");
  const state = await privateState(page);
  expect(state.blobs).toBe(2);
  await page.reload();
  await page.locator("#restore-draft").click();
  await expect(page.locator("#app-message")).toContainText(
    "Local draft restored",
  );
  await expect(page.locator('#listing-form [name="title"]')).toHaveValue(
    "Guest canal home",
  );
  await expect(page.locator("#composer-photo-queue img")).toHaveCount(2);
  await expect
    .poll(() =>
      page
        .locator("#composer-photo-queue img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth === 24,
          ),
        ),
    )
    .toBe(true);
  await expect(page.locator(".key-backup-panel")).toBeHidden();
  await page.locator("#publish-listing").click();
  await expect(page.locator("#app-message")).toContainText(
    /identity|extension/i,
  );
  expect(mock.events.size).toBe(0);
  expect(mock.uploads).toHaveLength(0);
  // Recovery belongs in an external signer, never an nsec input in this app.
  await expect(
    page.locator('input[name="nsec"], textarea[name="nsec"]'),
  ).toHaveCount(0);
  await page.locator("#generate-listing-key").click();
  const key = await backup(page);
  await page.locator("#save-draft").click();
  await expect(page.locator("#app-message")).toContainText("Draft saved");
  await noSecretLeak(page, mock, key);
  // Simulate closing the generated-key session before external signer recovery.
  await page.locator("#switch-account").click();
  await page.locator('[data-client-nav="editor"]').click();
  await page.locator("#restore-draft").click();
  await expect(page.locator("#composer-photo-queue img")).toHaveCount(2);
  await extension(page, key.secret);
  await page.locator("#choose-extension").click();
  await page.locator("#publish-listing").click();
  await expect.poll(() => mock.events.size).toBe(1);
  expect([...mock.events.values()][0].pubkey).toBe(key.pubkey);
  await noSecretLeak(page, mock, key);
});

test("generated public identity is memory-only rather than a persisted read-only login", async ({
  page,
}) => {
  const mock = await network(page);
  await fillGuest(page);
  await page.locator("#generate-listing-key").click();
  const key = await backup(page);
  const state = await noSecretLeak(page, mock, key);
  expect.soft(state.storage).not.toContain(key.pubkey);
  expect.soft(state.storage).not.toContain(key.npub);
  await page.reload();
  await expect(page.locator(".publishing-public-key")).toBeHidden();
  await expect(page.locator(".client-account-name")).toHaveText(
    "Not connected",
  );
});

for (const action of ["disconnect", "pagehide"] as const) {
  test(`generated signer is destroyed on ${action}`, async ({ page }) => {
    const mock = await network(page);
    await fillGuest(page);
    await page.locator("#generate-listing-key").click();
    const key = await backup(page);
    await page.locator("#key-backup-confirmed").check();
    if (action === "disconnect") await page.locator("#switch-account").click();
    else await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    if (action === "disconnect")
      await page.locator('[data-client-nav="editor"]').click();
    await expect(page.locator(".key-backup-panel")).toBeHidden();
    await page
      .locator('#listing-form [name="title"]')
      .fill("Cannot sign after reset");
    await page.locator('#listing-form [name="location"]').fill("Utrecht");
    await page
      .locator('#listing-form [name="description"]')
      .fill("Reset signer test");
    await page.locator("#publish-listing").click();
    await expect(page.locator("#app-message")).toContainText(
      /identity|extension/i,
    );
    expect(mock.events.size).toBe(0);
    expect(mock.uploads).toHaveLength(0);
    const state = await noSecretLeak(page, mock, key);
    expect.soft(state.storage).not.toContain(key.pubkey);
    await expect(page.locator(".publishing-public-key")).toBeHidden();
  });
}
