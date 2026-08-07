import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readLocale = (locale) =>
  JSON.parse(readFileSync(`src/lib/locales/${locale}.json`, "utf8"));

const translate = (locale, key, params) => {
  const template = key.split(".").reduce((value, part) => value?.[part], locale);
  assert.equal(typeof template, "string", `${key} exists in the locale`);
  return Object.entries(params).reduce(
    (message, [name, value]) => message.replaceAll(`{{${name}}}`, String(value)),
    template,
  );
};

const params = {
  sectorLevel: 2,
  requiredEngine: 2,
  requiredCaptain: 2,
  engineLevel: 1,
  captainLevel: 1,
};

const ru = translate(readLocale("ru"), "travel.access_requires", params);
const en = translate(readLocale("en"), "travel.access_requires", params);

assert.equal(
  ru,
  "Для доступа к сектору уровня 2 нужны: двигатель ур. 2 и капитан ур. 2. Сейчас: двигатель ур. 1, капитан ур. 1.",
);
assert.doesNotMatch(ru, /тир/i);
assert.equal(
  en,
  "To enter sector level 2, you need: Engine Lv. 2 and Captain Lv. 2. Current: Engine Lv. 1, Captain Lv. 1.",
);

console.log("Sector access copy checks passed");
