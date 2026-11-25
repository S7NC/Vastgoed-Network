import { mkdir, readdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { ZipArchive } from "archiver";

await mkdir("dist", { recursive: true });
const output = createWriteStream("dist/vastgoed.zip");
const archive = new ZipArchive({ zlib: { level: 9 } });
archive.on("error", (error) => {
  throw error;
});
archive.pipe(output);
for (const name of await readdir(".")) {
  if (
    name.endsWith(".hbs") ||
    name === "package.json" ||
    name === "routes.yaml"
  )
    archive.file(name, { name });
}
archive.directory("partials", "partials");
archive.directory("assets", "assets");
await archive.finalize();
await new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
});
console.log(
  "Created dist/vastgoed.zip. Upload routes.yaml separately in Ghost Admin.",
);
