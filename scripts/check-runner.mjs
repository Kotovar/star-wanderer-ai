import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = await mkdtemp(join(tmpdir(), "star-wanderer-check-runner-"));
const scripts = join(root, "scripts");
const invoke = () => run(process.execPath, [join(scripts, "run-checks.mjs")], {
  cwd: tmpdir(),
  timeout: 15_000,
});

try {
  await mkdir(scripts);
  await copyFile(new URL("./run-checks.mjs", import.meta.url), join(scripts, "run-checks.mjs"));
  await assert.rejects(invoke(), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Не найдены scripts\/check-\*\.mjs/);
    return true;
  });

  await writeFile(join(scripts, "helper.mjs"), 'throw new Error("must not run");');
  await writeFile(join(scripts, "check-first.mjs"), `
    import assert from "node:assert/strict";
    import { access, writeFile } from "node:fs/promises";
    import { setTimeout } from "node:timers/promises";
    assert.equal(process.env.NODE_ENV, "production");
    await writeFile("first-started", "");
    let parallel = false;
    for (let i = 0; i < 100; i++) {
      parallel = await access("second-started").then(() => true, () => false);
      if (parallel) break;
      await setTimeout(20);
    }
    assert.ok(parallel, "checks must run in parallel");
    await writeFile("first-finished", "");
  `);
  await writeFile(join(scripts, "check-second.mjs"), `
    import { writeFile } from "node:fs/promises";
    await writeFile("second-started", "");
  `);

  const success = await invoke();
  assert.match(success.stdout, /PASS check-first\.mjs/);
  assert.match(success.stdout, /PASS check-second\.mjs/);
  assert.match(success.stdout, /Прошло: 2; упало: 0; всего: 2/);
  assert.equal(success.stderr, "");

  await writeFile(join(scripts, "check-broken.mjs"), 'throw new Error("fixture failure");');
  await writeFile(join(scripts, "check-new-game-setup.mjs"), `
    import { writeFile } from "node:fs/promises";
    await writeFile(process.env.NODE_ENV, "checked");
  `);
  await assert.rejects(invoke(), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /FAIL check-broken\.mjs: Error: fixture failure/);
    assert.match(error.stdout, /PASS check-first\.mjs/);
    assert.match(error.stdout, /PASS check-second\.mjs/);
    assert.match(error.stdout, /PASS check-new-game-setup\.mjs \(development\)/);
    assert.match(error.stdout, /PASS check-new-game-setup\.mjs \(production\)/);
    assert.match(error.stdout, /Прошло: 4; упало: 1; всего: 5/);
    return true;
  });
  assert.equal(await readFile(join(root, "first-finished"), "utf8"), "");
  assert.equal(await readFile(join(root, "development"), "utf8"), "checked");
  assert.equal(await readFile(join(root, "production"), "utf8"), "checked");
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log("check runner checks passed");
