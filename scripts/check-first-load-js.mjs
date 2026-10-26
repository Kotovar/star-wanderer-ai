import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getFirstLoadJsBytes } from "./first-load-js.mjs";

const root = await mkdtemp(join(tmpdir(), "star-wanderer-bundle-"));
const buildDir = pathToFileURL(`${root}/`);
const htmlFile = join(root, "server/app/index.html");

try {
  await assert.rejects(getFirstLoadJsBytes(buildDir), { code: "ENOENT" });
  await mkdir(join(root, "server/app"), { recursive: true });
  await mkdir(join(root, "static/chunks"), { recursive: true });
  await writeFile(htmlFile, "<html></html>");
  await assert.rejects(getFirstLoadJsBytes(buildDir), /No first-load JS/);

  await writeFile(join(root, "static/chunks/main.js"), "12345");
  await writeFile(join(root, "static/chunks/page.js"), "123");
  await writeFile(join(root, "static/chunks/lazy.js"), "not in the initial page");
  await writeFile(htmlFile, `
    <script src="/_next/static/chunks/main.js" async=""></script>
    <script src="/_next/static/chunks/main.js?version=1"></script>
    <script defer src="/_next/static/chunks/page.js?version=1"></script>
    <script src="/_next/static/chunks/legacy.js" noModule=""></script>
    <link rel="preload" href="/_next/static/chunks/main.js" as="script">
    <link rel="stylesheet" href="/_next/static/style.css">
    <script src="https://example.com/external.js"></script>
    <script>console.log("inline");</script>
  `);
  assert.equal(await getFirstLoadJsBytes(buildDir), 8, "count each initial chunk once, excluding lazy chunks");
  await writeFile(join(root, "static/chunks/page.js"), "1234567");
  assert.equal(await getFirstLoadJsBytes(buildDir), 12, "a larger initial chunk increases the measured size");
  await rm(join(root, "static/chunks/page.js"));
  await assert.rejects(getFirstLoadJsBytes(buildDir), { code: "ENOENT" });
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log("first-load JS measurement checks passed");
