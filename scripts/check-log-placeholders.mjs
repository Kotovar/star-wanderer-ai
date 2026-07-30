import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

/**
 * Ловит два класса багов, которые видны игроку как сырой текст в журнале:
 *   1. строка ждёт {{placeholder}}, которого вызов не передаёт;
 *   2. один и тот же ключ объявлен в объекте дважды — JSON.parse молча берёт
 *      последний, и вызывающий получает чужое сообщение.
 */

const LOCALES = ["src/lib/locales/ru.json", "src/lib/locales/en.json"];

/** Ключи, объявленные дважды в одном объекте. */
function findDuplicateKeys(source) {
  const duplicates = [];
  const stack = [];
  let index = 0;
  let line = 1;

  while (index < source.length) {
    const char = source[index];
    if (char === "\n") { line += 1; index += 1; continue; }
    if (char === "{") { stack.push(new Map()); index += 1; continue; }
    if (char === "[") { stack.push(null); index += 1; continue; }
    if (char === "}" || char === "]") { stack.pop(); index += 1; continue; }
    if (char !== '"') { index += 1; continue; }

    let cursor = index + 1;
    let text = "";
    while (cursor < source.length && source[cursor] !== '"') {
      if (source[cursor] === "\\") { text += source[cursor + 1]; cursor += 2; }
      else { text += source[cursor]; cursor += 1; }
    }
    let after = cursor + 1;
    while (after < source.length && /\s/.test(source[after])) after += 1;

    const owner = stack[stack.length - 1];
    if (source[after] === ":" && owner instanceof Map) {
      if (owner.has(text)) duplicates.push(`"${text}" — строки ${owner.get(text)} и ${line}`);
      else owner.set(text, line);
    }
    for (let scan = index; scan < cursor; scan += 1) {
      if (source[scan] === "\n") line += 1;
    }
    index = cursor + 1;
  }

  return duplicates;
}

/** Текст объекта-аргумента со сбалансированными скобками. */
function readArgumentObject(source, from) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(from + 1, index);
    }
  }
  return null;
}

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}

const lookup = (object, path) =>
  path.split(".").reduce((current, key) => current?.[key], object);

for (const locale of LOCALES) {
  const duplicates = findDuplicateKeys(await readFile(locale, "utf8"));
  assert.deepEqual(
    duplicates,
    [],
    `${locale}: ключ объявлен дважды — вызывающий молча получит чужое сообщение`,
  );
}

const russian = JSON.parse(await readFile(LOCALES[0], "utf8"));
const english = JSON.parse(await readFile(LOCALES[1], "utf8"));
const files = await collectSourceFiles("src");
const problems = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const calls = /\bt\(\s*"([\w.]+)"\s*,\s*(?=\{)/g;
  let match;

  while ((match = calls.exec(source))) {
    const key = match[1];
    const args = readArgumentObject(source, calls.lastIndex);
    if (args === null) continue;

    const passed = new Set([
      ...[...args.matchAll(/(?:^|[,{])\s*(\w+)\s*:/g)].map((item) => item[1]),
      ...[...args.matchAll(/(?:^|[,{])\s*(\w+)\s*(?=[,}]|$)/g)].map((item) => item[1]),
    ]);

    for (const [language, translations] of [["ru", russian], ["en", english]]) {
      const value = lookup(translations, key);
      if (typeof value !== "string") continue;
      const placeholders = [
        ...new Set([...value.matchAll(/\{\{(\w+)\}\}/g)].map((item) => item[1])),
      ];
      const missing = placeholders.filter((name) => !passed.has(name));
      if (missing.length > 0) {
        problems.push(
          `${file.replace("src/", "")} → ${key} [${language}]: не подставлено ${missing.join(", ")}`,
        );
      }
    }
  }
}

assert.deepEqual(
  problems,
  [],
  "в журнале нельзя показывать сырые {{плейсхолдеры}}",
);

console.log(
  `Log placeholder checks passed (${files.length} файлов, ${LOCALES.length} локали)`,
);
