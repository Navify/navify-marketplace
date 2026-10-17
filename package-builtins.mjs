import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const current = dirname(fileURLToPath(import.meta.url));
const output = resolve(current, "dist", "builtins");
const resourcesOutput = resolve(current, "dist", "resources", "assets");
const project = process.env.NAVIFY_PROJECT_ROOT ? resolve(process.env.NAVIFY_PROJECT_ROOT) : resolve(current, "..");

await rm(output, { recursive: true, force: true });
await rm(resourcesOutput, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(resourcesOutput, { recursive: true });
await cp(resolve(project, "Navify", "Extensions", "listening-journal.js"), resolve(output, "listening-journal.js"));
await cp(resolve(project, "navify-themes", "Navuryx"), resolve(output, "navuryx"), { recursive: true });
await cp(resolve(current, "resources", "assets", "snippets"), resolve(resourcesOutput, "snippets"), { recursive: true });
await cp(resolve(current, "resources", "snippets.json"), resolve(current, "dist", "resources", "snippets.json"));
await cp(resolve(current, "resources", "blacklist.json"), resolve(current, "dist", "resources", "blacklist.json"));

const manifestPath = resolve(current, "dist", "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.assets = ["builtins/listening-journal.js", "builtins/navuryx", "resources/assets", "resources/snippets.json", "resources/blacklist.json"];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
