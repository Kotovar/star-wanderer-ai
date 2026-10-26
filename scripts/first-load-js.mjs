import { readFile, stat } from "node:fs/promises";

export async function getFirstLoadJsBytes(buildDir = new URL("../.next/", import.meta.url)) {
  const html = await readFile(new URL("server/app/index.html", buildDir), "utf8");
  const files = new Set(
    Array.from(html.matchAll(/<script\b[^>]*\ssrc="\/_next\/(static\/[^"?]+\.js)(?:\?[^"]*)?"[^>]*>/g))
      .filter((match) => !/\snomodule[\s=>]/i.test(match[0]))
      .map((match) => match[1]),
  );
  if (files.size === 0) throw new Error("No first-load JS in the production home page; run npm run build");
  const sizes = await Promise.all(Array.from(files, (file) => stat(new URL(file, buildDir))));
  return sizes.reduce((total, file) => total + file.size, 0);
}
