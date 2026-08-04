import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [crewList, ru, en] = await Promise.all([
  readFile(new URL("../src/game/components/CrewList.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"),
]);

assert.match(
  crewList,
  /import \{ getExpNeededForNextLevel \} from "@\/game\/slices\/crew\/helpers\/getExpNeededForNextLevel"/,
  "crew cards must share the level-up XP requirement helper",
);
assert.match(
  crewList,
  /const expNeeded = getExpNeededForNextLevel\(member\.level \|\| 1\)/,
  "compact XP progress must use the shared requirement",
);
assert.match(
  crewList,
  /t\("crew_member\.experience"\).*member\.exp.*expNeeded/s,
  "compact cards must show actual and required XP beside the bar",
);
assert.match(
  crewList,
  /Tooltip(?:Provider)?[\s\S]*crew_member\.assignment_fatigue_tooltip/,
  "organic fatigue status must use the shared tooltip primitive",
);
assert.match(
  crewList,
  /race\?\.hasFatigue === false[\s\S]*crew_member\.fatigue_free[\s\S]*crew_member\.fatigue_free_tooltip/,
  "fatigue-free races must have their own compact label and tooltip",
);
assert.equal(
  (crewList.match(/<TooltipTrigger asChild>\s*<span\s+tabIndex=\{0\}/g) ?? []).length,
  2,
  "both compact fatigue tooltip triggers must be keyboard-focusable",
);

for (const [locale, source] of [["ru", ru], ["en", en]]) {
  for (const key of ["assignment_fatigue_tooltip", "fatigue_free", "fatigue_free_tooltip"]) {
    assert.match(source, new RegExp(`"${key}":\\s*"[^"\\n]+"`), `${locale} must translate ${key}`);
  }
}

console.log("Crew card feedback checks passed");
