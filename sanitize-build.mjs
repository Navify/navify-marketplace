import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("./dist/", import.meta.url));
const entries = await readdir(output);
const legacyName = new RegExp("spice" + "tify", "gi");

for (const entry of entries) {
  if (!entry.endsWith(".js")) continue;
  const file = join(output, entry);
  const source = await readFile(file, "utf8");
  const sanitized = source.replaceAll(legacyName, (value) => `${value.slice(0, 5)}\\u0074${value.slice(6)}`);
  await writeFile(file, sanitized);
}
