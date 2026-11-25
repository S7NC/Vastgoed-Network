// Source branding reference: Vastgoed.org; render repository-authored SVGs only.
// Run explicitly with node scripts/generate-brand-assets.mjs, never during builds.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

if (process.argv.length !== 2) {
  throw new Error(
    "No arguments supported. Run node scripts/generate-brand-assets.mjs",
  );
}

const images = new URL("../assets/images/", import.meta.url);
const assets = [
  {
    source: "social-preview.svg",
    output: "social-preview.png",
    width: 1200,
    height: 630,
  },
  {
    source: "favicon.svg",
    output: "apple-touch-icon.png",
    width: 180,
    height: 180,
  },
];

// Read both inputs first so a missing source cannot leave a partially updated set.
const sources = await Promise.all(
  assets.map(async (asset) => ({
    ...asset,
    svg: await readFile(new URL(asset.source, images), "utf8"),
  })),
);

const browser = await chromium.launch();
try {
  for (const { svg, output, width, height } of sources) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    try {
      await context.route("**/*", (route) => route.abort());
      const page = await context.newPage();
      const data = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      await page.setContent(
        `<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#253c31}img{display:block;width:100%;height:100%}</style></head><body><img alt="" src="${data}"></body></html>`,
      );
      await page.locator("img").evaluate(async (image) => {
        await image.decode();
        await document.fonts.ready;
      });
      await page.screenshot({
        path: fileURLToPath(new URL(output, images)),
        type: "png",
        animations: "disabled",
      });
      console.log(`Generated assets/images/${output} (${width}x${height})`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
